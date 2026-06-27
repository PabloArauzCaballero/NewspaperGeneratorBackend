import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../types/authenticated-user';

type RequestWithUser = Request & { user?: AuthenticatedUser };

type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
};

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = jwt.verify(token, this.configService.getOrThrow<string>('JWT_SECRET')) as JwtPayload;
      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? []
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = getBearerToken(request);

    if (!token) return true;

    try {
      const payload = jwt.verify(token, this.configService.getOrThrow<string>('JWT_SECRET')) as JwtPayload;
      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? []
      };
    } catch {
      request.user = undefined;
    }

    return true;
  }
}
