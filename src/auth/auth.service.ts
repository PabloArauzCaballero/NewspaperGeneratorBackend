import { ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { LoginDto, RegisterDto, RequestPasswordResetDto, ResetPasswordDto } from './auth.schemas';

type RequestMetadata = { ip?: string; userAgent?: string };

type UserAuthRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  status: string;
  roles: string[] | null;
  failed_login_attempts?: number;
  locked_until?: Date | string | null;
};

type PublicUser = {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
};

type AuthResponse = { user: PublicUser; accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: string };

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  email: string;
  full_name: string;
  status: string;
  roles: string[] | null;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto, metadata: RequestMetadata = {}): Promise<AuthResponse> {
    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    try {
      return await this.sequelize.transaction(async (transaction) => {
        const existing = await this.sequelize.query<{ id: string }>(
          'SELECT id FROM users WHERE email = :email LIMIT 1 FOR UPDATE',
          { replacements: { email: dto.email }, type: QueryTypes.SELECT, transaction }
        );

        if (existing.length > 0) {
          throw new ConflictException('Email is already registered');
        }

        const [readerRole] = await this.sequelize.query<{ id: string }>('SELECT id FROM roles WHERE name = :name LIMIT 1', {
          replacements: { name: 'reader' },
          type: QueryTypes.SELECT,
          transaction
        });
        if (!readerRole) {
          throw new Error('Seed integrity error: reader role is required before registering users');
        }

        const [user] = await this.sequelize.query<UserAuthRow>(
          `
          INSERT INTO users (full_name, email, password_hash, status, email_verified_at)
          VALUES (:fullName, :email, :passwordHash, 'active', now())
          RETURNING id, full_name, email, password_hash, status, ARRAY[:readerRole]::text[] AS roles;
          `,
          {
            replacements: { fullName: dto.fullName, email: dto.email, passwordHash, readerRole: 'reader' },
            type: QueryTypes.SELECT,
            transaction
          }
        );

        await this.sequelize.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`,
          {
            replacements: { userId: user.id, roleId: readerRole.id },
            type: QueryTypes.INSERT,
            transaction
          }
        );

        await this.writeLoginAttempt(dto.email, user.id, true, null, metadata, transaction);
        await this.writeOutbox('UserRegistered', 'User', user.id, { email: user.email }, transaction);
        const refreshToken = await this.createRefreshToken(user.id, metadata, transaction);
        return this.buildAuthResponse({ ...user, roles: ['reader'] }, refreshToken.rawToken);
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error && /users_email|unique|duplicate key/i.test(error.message)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, metadata: RequestMetadata = {}): Promise<AuthResponse> {
    const user = await this.findUserWithRoles(dto.email);
    if (!user) {
      await this.writeLoginAttempt(dto.email, null, false, 'user_not_found', metadata);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      await this.writeLoginAttempt(dto.email, user.id, false, `status_${user.status}`, metadata);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (this.isLocked(user.locked_until)) {
      await this.writeLoginAttempt(dto.email, user.id, false, 'locked_until', metadata);
      throw new ForbiddenException('Account temporarily locked after repeated failed login attempts');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordMatches) {
      await this.recordFailedLogin(user, metadata);
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sequelize.transaction(async (transaction) => {
      await this.sequelize.query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = null, updated_at = now() WHERE id = :userId`,
        { replacements: { userId: user.id }, type: QueryTypes.UPDATE, transaction }
      );
      await this.writeLoginAttempt(user.email, user.id, true, null, metadata, transaction);
      await this.writeOutbox('UserLoggedIn', 'User', user.id, { email: user.email }, transaction);
      const refreshToken = await this.createRefreshToken(user.id, metadata, transaction);
      return this.buildAuthResponse(user, refreshToken.rawToken);
    });
  }

  async refresh(refreshToken: string, metadata: RequestMetadata = {}): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const [row] = await this.sequelize.query<RefreshTokenRow>(
      `
      SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, rt.revoked_at,
             u.email, u.full_name, u.status,
             COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles
      FROM user_refresh_tokens rt
      INNER JOIN users u ON u.id = rt.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE rt.token_hash = :tokenHash
      GROUP BY rt.id, u.id
      LIMIT 1;
      `,
      { replacements: { tokenHash }, type: QueryTypes.SELECT }
    );

    if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now() || row.status !== 'active') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user: UserAuthRow = {
      id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      password_hash: '',
      status: row.status,
      roles: row.roles ?? []
    };

    return this.sequelize.transaction(async (transaction) => {
      const replacement = await this.createRefreshToken(row.user_id, metadata, transaction);
      await this.sequelize.query(
        `UPDATE user_refresh_tokens SET revoked_at = now(), replaced_by_token_id = :replacementId, last_used_at = now() WHERE id = :oldId`,
        { replacements: { replacementId: replacement.id, oldId: row.id }, type: QueryTypes.UPDATE, transaction }
      );
      return this.buildAuthResponse(user, replacement.rawToken);
    });
  }

  async logout(userId: string, refreshToken: string): Promise<{ status: 'ok'; revoked: boolean }> {
    const tokenHash = this.hashToken(refreshToken);
    const [row] = await this.sequelize.query<{ id: string }>(
      `UPDATE user_refresh_tokens SET revoked_at = now() WHERE user_id = :userId AND token_hash = :tokenHash AND revoked_at IS NULL RETURNING id`,
      { replacements: { userId, tokenHash }, type: QueryTypes.SELECT }
    );
    return { status: 'ok', revoked: Boolean(row) };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto, metadata: RequestMetadata = {}) {
    const [user] = await this.sequelize.query<{ id: string; email: string }>('SELECT id, email FROM users WHERE email = :email AND status <> :deleted LIMIT 1', {
      replacements: { email: dto.email, deleted: 'deleted' },
      type: QueryTypes.SELECT
    });

    if (!user) {
      return { status: 'ok', message: 'If the account exists, a reset instruction has been generated.' };
    }

    const rawToken = this.generateOpaqueToken();
    const tokenHash = this.hashToken(rawToken);
    await this.sequelize.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_by_ip, user_agent) VALUES (:userId, :tokenHash, now() + interval '30 minutes', :ip, :userAgent)`,
      { replacements: { userId: user.id, tokenHash, ip: metadata.ip ?? null, userAgent: metadata.userAgent ?? null }, type: QueryTypes.INSERT }
    );

    const response: Record<string, unknown> = { status: 'ok', message: 'If the account exists, a reset instruction has been generated.' };
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      response.debugResetToken = rawToken;
    }
    return response;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ status: 'ok' }> {
    const tokenHash = this.hashToken(dto.resetToken);
    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);

    return this.sequelize.transaction(async (transaction) => {
      const [token] = await this.sequelize.query<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM password_reset_tokens WHERE token_hash = :tokenHash AND consumed_at IS NULL AND expires_at > now() LIMIT 1 FOR UPDATE`,
        { replacements: { tokenHash }, type: QueryTypes.SELECT, transaction }
      );
      if (!token) throw new UnauthorizedException('Invalid or expired reset token');

      await this.sequelize.query(
        `UPDATE users SET password_hash = :passwordHash, failed_login_attempts = 0, locked_until = null, updated_at = now() WHERE id = :userId`,
        { replacements: { userId: token.user_id, passwordHash }, type: QueryTypes.UPDATE, transaction }
      );
      await this.sequelize.query(`UPDATE password_reset_tokens SET consumed_at = now() WHERE id = :tokenId`, { replacements: { tokenId: token.id }, type: QueryTypes.UPDATE, transaction });
      await this.sequelize.query(`UPDATE user_refresh_tokens SET revoked_at = now() WHERE user_id = :userId AND revoked_at IS NULL`, { replacements: { userId: token.user_id }, type: QueryTypes.UPDATE, transaction });
      await this.writeOutbox('UserPasswordReset', 'User', token.user_id, {}, transaction);
      return { status: 'ok' };
    });
  }

  async me(userId: string): Promise<Record<string, unknown>> {
    const [user] = await this.sequelize.query<{
      id: string;
      full_name: string;
      email: string;
      status: string;
      email_verified_at: Date | null;
      roles: string[] | null;
      is_premium: boolean;
    }>(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.status,
        u.email_verified_at,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles,
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()
        ) AS is_premium
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = :userId
      GROUP BY u.id
      LIMIT 1;
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      status: user.status,
      emailVerified: Boolean(user.email_verified_at),
      roles: user.roles ?? [],
      isPremium: user.is_premium
    };
  }

  private async findUserWithRoles(email: string): Promise<UserAuthRow | null> {
    const [user] = await this.sequelize.query<UserAuthRow>(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.password_hash,
        u.status,
        u.failed_login_attempts,
        u.locked_until,
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.email = :email
      GROUP BY u.id
      LIMIT 1;
      `,
      { replacements: { email }, type: QueryTypes.SELECT }
    );

    return user ?? null;
  }

  private async recordFailedLogin(user: UserAuthRow, metadata: RequestMetadata) {
    await this.sequelize.transaction(async (transaction) => {
      const nextFailures = Number(user.failed_login_attempts ?? 0) + 1;
      const shouldLock = nextFailures >= 5;
      await this.sequelize.query(
        `UPDATE users SET failed_login_attempts = :failures, locked_until = CASE WHEN :shouldLock THEN now() + interval '15 minutes' ELSE locked_until END, updated_at = now() WHERE id = :userId`,
        { replacements: { failures: nextFailures, shouldLock, userId: user.id }, type: QueryTypes.UPDATE, transaction }
      );
      await this.writeLoginAttempt(user.email, user.id, false, shouldLock ? 'invalid_password_locked' : 'invalid_password', metadata, transaction);
    });
  }

  private isLocked(lockedUntil: Date | string | null | undefined): boolean {
    if (!lockedUntil) return false;
    return new Date(lockedUntil).getTime() > Date.now();
  }

  private async writeLoginAttempt(email: string, userId: string | null, success: boolean, failureReason: string | null, metadata: RequestMetadata, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO auth_login_attempts (email, user_id, success, failure_reason, ip_address, user_agent) VALUES (:email, :userId, :success, :failureReason, :ip, :userAgent)`,
      {
        replacements: { email, userId, success, failureReason, ip: metadata.ip ?? null, userAgent: metadata.userAgent ?? null },
        type: QueryTypes.INSERT,
        transaction
      }
    ).catch(() => undefined);
  }

  private async writeOutbox(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `
      INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, correlation_id, causation_id)
      VALUES (:eventType, :aggregateType, :aggregateId, :payload::jsonb, gen_random_uuid(), gen_random_uuid())
      `,
      { replacements: { eventType, aggregateType, aggregateId, payload: JSON.stringify(payload) }, type: QueryTypes.INSERT, transaction }
    );
  }

  private buildAuthResponse(user: UserAuthRow, refreshToken: string): AuthResponse {
    return {
      user: this.toPublicUser(user),
      accessToken: this.signAccessToken(user),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m')
    };
  }

  private toPublicUser(user: UserAuthRow): PublicUser {
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      roles: user.roles ?? []
    };
  }

  private signAccessToken(user: UserAuthRow): string {
    const roles = user.roles ?? [];
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles
      },
      this.configService.getOrThrow<string>('JWT_SECRET'),
      { expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as SignOptions['expiresIn'] }
    );
  }

  private async createRefreshToken(userId: string, metadata: RequestMetadata, transaction: Transaction): Promise<{ id: string; rawToken: string }> {
    const rawToken = this.generateOpaqueToken();
    const tokenHash = this.hashToken(rawToken);
    const days = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS', 30);
    const [row] = await this.sequelize.query<{ id: string }>(
      `
      INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at, created_by_ip, user_agent)
      VALUES (:userId, :tokenHash, now() + (:days::text || ' days')::interval, :ip, :userAgent)
      RETURNING id;
      `,
      { replacements: { userId, tokenHash, days, ip: metadata.ip ?? null, userAgent: metadata.userAgent ?? null }, type: QueryTypes.SELECT, transaction }
    );
    return { id: row.id, rawToken };
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return crypto.createHmac('sha256', this.configService.getOrThrow<string>('JWT_SECRET')).update(token).digest('hex');
  }
}
