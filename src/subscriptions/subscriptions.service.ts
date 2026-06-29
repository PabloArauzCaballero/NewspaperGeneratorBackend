import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SEQUELIZE } from '../database/database.constants';
import { AdminActivateSubscriptionDto, CheckoutDto, CancelSubscriptionDto } from './subscriptions.schemas';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService
  ) {}

  async listActivePlans(): Promise<Array<Record<string, unknown>>> {
    return this.redisCache.rememberJson(this.redisCache.key('subscriptions', 'active-plans'), 600, async () => {
      const plans = await this.sequelize.query<{ id: string; name: string; description: string | null; price: string; currency: string; duration_days: number }>(
        `SELECT id, name, description, price, currency, duration_days FROM subscription_plans WHERE is_active = true ORDER BY duration_days ASC`,
        { type: QueryTypes.SELECT }
      );
      return plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: Number(plan.price),
        currency: plan.currency,
        durationDays: plan.duration_days,
        note: 'Demo seed only; final prices and payment provider are pending business decisions.'
      }));
    });
  }

  async me(userId: string, transaction?: Transaction) {
    const [subscription] = await this.sequelize.query(
      `
      SELECT s.id, s.status, s.starts_at AS "startsAt", s.ends_at AS "endsAt", s.cancelled_at AS "cancelledAt",
             p.id AS "planId", p.name AS "planName", p.price, p.currency, p.duration_days AS "durationDays",
             (s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()) AS "isPremium"
      FROM subscriptions s
      INNER JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.user_id = :userId
      ORDER BY s.created_at DESC
      LIMIT 1;
      `,
      { replacements: { userId }, type: QueryTypes.SELECT, transaction }
    );
    return subscription ?? { isPremium: false, subscription: null };
  }

  async checkout(dto: CheckoutDto, userId: string) {
    return this.sequelize.transaction(async (transaction) => {
      await this.assertUserExists(userId, transaction);
      const [plan] = await this.sequelize.query<{ id: string; price: string; currency: string; duration_days: number }>(
        `SELECT id, price, currency, duration_days FROM subscription_plans WHERE id = :planId AND is_active = true LIMIT 1`,
        { replacements: { planId: dto.planId }, type: QueryTypes.SELECT, transaction }
      );
      if (!plan) throw new NotFoundException('Subscription plan not found');

      const [subscription] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
        VALUES (:userId, :planId, 'pending_payment', now(), now() + (:durationDays::text || ' days')::interval)
        RETURNING id;
        `,
        { replacements: { userId, planId: plan.id, durationDays: plan.duration_days }, type: QueryTypes.SELECT, transaction }
      );
      const externalReference = `demo-checkout-${subscription.id}`;
      await this.sequelize.query(
        `INSERT INTO payment_transactions (subscription_id, provider, external_reference, amount, currency, status) VALUES (:subscriptionId, 'manual_demo', :externalReference, :amount, :currency, 'pending')`,
        { replacements: { subscriptionId: subscription.id, externalReference, amount: plan.price, currency: plan.currency }, type: QueryTypes.INSERT, transaction }
      );
      await this.writeOutbox('SubscriptionPaymentStarted', 'Subscription', subscription.id, { subscriptionId: subscription.id, userId, planId: plan.id, externalReference }, transaction);

      return {
        subscriptionId: subscription.id,
        provider: 'manual_demo',
        externalReference,
        status: 'pending_payment',
        note: 'Checkout demo: el proveedor de pagos real está pendiente de decisión de negocio.'
      };
    });
  }

  async activateManual(dto: AdminActivateSubscriptionDto, actorUserId: string) {
    const result = await this.sequelize.transaction(async (transaction) => {
      await this.assertUserExists(dto.userId, transaction);
      const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
      const plan = await this.getPlan(dto.planId, transaction);
      const endsAt = dto.endsAt ? new Date(dto.endsAt) : new Date(startsAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
      if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');

      await this.sequelize.query(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
         WHERE user_id = :userId AND status = 'active' AND starts_at <= now() AND ends_at > now()`,
        { replacements: { userId: dto.userId }, type: QueryTypes.UPDATE, transaction }
      );

      const [subscription] = await this.sequelize.query<{ id: string }>(
        `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at) VALUES (:userId, :planId, 'active', :startsAt, :endsAt) RETURNING id`,
        { replacements: { userId: dto.userId, planId: dto.planId, startsAt, endsAt }, type: QueryTypes.SELECT, transaction }
      );
      await this.writeOutbox('SubscriptionActivated', 'Subscription', subscription.id, { subscriptionId: subscription.id, userId: dto.userId, source: 'manual_admin', reason: dto.reason }, transaction);
      await this.audit(actorUserId, subscription.id, 'subscription.manual_activated', dto, transaction);
      return { userId: dto.userId };
    });
    await this.invalidateArticleCaches();
    return this.me(result.userId);
  }

  async cancel(subscriptionId: string, dto: CancelSubscriptionDto, actorUserId: string) {
    const result = await this.sequelize.transaction(async (transaction) => {
      const [row] = await this.sequelize.query<{ id: string; user_id: string }>(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = :subscriptionId RETURNING id, user_id`,
        { replacements: { subscriptionId }, type: QueryTypes.SELECT, transaction }
      );
      if (!row) throw new NotFoundException('Subscription not found');
      await this.writeOutbox('SubscriptionCancelled', 'Subscription', subscriptionId, { subscriptionId, userId: row.user_id, reason: dto.reason ?? null }, transaction);
      await this.audit(actorUserId, subscriptionId, 'subscription.cancelled', dto, transaction);
      return { userId: row.user_id };
    });
    await this.invalidateArticleCaches();
    return this.me(result.userId);
  }

  private async getPlan(planId: string, transaction?: Transaction) {
    const [plan] = await this.sequelize.query<{ id: string; duration_days: number }>(
      `SELECT id, duration_days FROM subscription_plans WHERE id = :planId AND is_active = true LIMIT 1`,
      { replacements: { planId }, type: QueryTypes.SELECT, transaction }
    );
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  private async assertUserExists(userId: string, transaction?: Transaction): Promise<void> {
    const [row] = await this.sequelize.query<{ id: string }>(`SELECT id FROM users WHERE id = :userId LIMIT 1`, {
      replacements: { userId },
      type: QueryTypes.SELECT,
      transaction
    });
    if (!row) throw new NotFoundException('User not found');
  }

  private async invalidateArticleCaches() {
    await this.redisCache.deleteByPattern(this.redisCache.key('articles', '*'));
  }

  private async writeOutbox(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, correlation_id, causation_id) VALUES (:eventType, :aggregateType, :aggregateId, :payload::jsonb, gen_random_uuid(), gen_random_uuid())`,
      { replacements: { eventType, aggregateType, aggregateId, payload: JSON.stringify(payload) }, type: QueryTypes.INSERT, transaction }
    );
  }

  private async audit(actorUserId: string, entityId: string, action: string, metadata: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, metadata) VALUES (:actorUserId, 'Subscription', :entityId, :action, :metadata::jsonb)`,
      { replacements: { actorUserId, entityId, action, metadata: JSON.stringify(metadata) }, type: QueryTypes.INSERT, transaction }
    );
  }
}
