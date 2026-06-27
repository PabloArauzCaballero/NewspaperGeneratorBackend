import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { PaymentWebhookDto } from './payments.schemas';

@Injectable()
export class PaymentsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async webhook(dto: PaymentWebhookDto) {
    return this.sequelize.transaction(async (transaction) => {
      const existing = await this.sequelize.query<{ id: string; status: string }>(
        `SELECT id, status FROM payment_webhook_events WHERE provider = :provider AND external_event_id = :externalEventId LIMIT 1`,
        { replacements: { provider: dto.provider, externalEventId: dto.externalEventId }, type: QueryTypes.SELECT, transaction }
      );
      if (existing.length > 0) {
        return { idempotent: true, status: existing[0].status, webhookEventId: existing[0].id };
      }

      const [payment] = await this.sequelize.query<{ id: string; subscription_id: string; amount: string; currency: string }>(
        `SELECT id, subscription_id, amount, currency FROM payment_transactions WHERE external_reference = :externalReference LIMIT 1`,
        { replacements: { externalReference: dto.externalReference }, type: QueryTypes.SELECT, transaction }
      );
      if (!payment) throw new NotFoundException('Payment transaction not found');
      if (dto.amount !== undefined && Number(payment.amount) !== dto.amount) throw new BadRequestException('Webhook amount does not match payment transaction');
      if (dto.currency !== undefined && payment.currency !== dto.currency) throw new BadRequestException('Webhook currency does not match payment transaction');

      const [webhookEvent] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO payment_webhook_events (provider, external_event_id, event_type, payload, status)
        VALUES (:provider, :externalEventId, :eventType, :payload::jsonb, 'received')
        RETURNING id;
        `,
        { replacements: { provider: dto.provider, externalEventId: dto.externalEventId, eventType: dto.eventType, payload: JSON.stringify(dto.rawPayload) }, type: QueryTypes.SELECT, transaction }
      );

      const statusMap: Record<string, string> = {
        'payment.succeeded': 'succeeded',
        'payment.failed': 'failed',
        'payment.cancelled': 'cancelled',
        'payment.refunded': 'refunded'
      };
      const paymentStatus = statusMap[dto.eventType];
      await this.sequelize.query(
        `UPDATE payment_transactions SET status = :paymentStatus, paid_at = CASE WHEN :paymentStatus = 'succeeded' THEN now() ELSE paid_at END WHERE id = :paymentId`,
        { replacements: { paymentStatus, paymentId: payment.id }, type: QueryTypes.UPDATE, transaction }
      );

      if (dto.eventType === 'payment.succeeded') {
        await this.sequelize.query(`UPDATE subscriptions SET status = 'active', starts_at = now(), updated_at = now() WHERE id = :subscriptionId`, {
          replacements: { subscriptionId: payment.subscription_id }, type: QueryTypes.UPDATE, transaction
        });
        await this.writeOutbox('SubscriptionPaymentSucceeded', 'Subscription', payment.subscription_id, { subscriptionId: payment.subscription_id, paymentId: payment.id }, transaction);
        await this.writeOutbox('SubscriptionActivated', 'Subscription', payment.subscription_id, { subscriptionId: payment.subscription_id, source: 'payment_webhook' }, transaction);
      } else {
        await this.sequelize.query(`UPDATE subscriptions SET status = :subscriptionStatus, updated_at = now() WHERE id = :subscriptionId`, {
          replacements: { subscriptionId: payment.subscription_id, subscriptionStatus: dto.eventType === 'payment.failed' ? 'payment_failed' : 'cancelled' }, type: QueryTypes.UPDATE, transaction
        });
      }

      await this.sequelize.query(`UPDATE payment_webhook_events SET status = 'processed', processed_at = now() WHERE id = :id`, {
        replacements: { id: webhookEvent.id }, type: QueryTypes.UPDATE, transaction
      });
      return { idempotent: false, status: 'processed', webhookEventId: webhookEvent.id, paymentTransactionId: payment.id, subscriptionId: payment.subscription_id };
    });
  }

  async listAdmin() {
    return this.sequelize.query(
      `
      SELECT pt.id, pt.provider, pt.external_reference AS "externalReference", pt.amount, pt.currency, pt.status, pt.paid_at AS "paidAt", pt.created_at AS "createdAt",
             pt.subscription_id AS "subscriptionId", s.user_id AS "userId"
      FROM payment_transactions pt
      INNER JOIN subscriptions s ON s.id = pt.subscription_id
      ORDER BY pt.created_at DESC
      LIMIT 200;
      `,
      { type: QueryTypes.SELECT }
    );
  }

  private async writeOutbox(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, correlation_id, causation_id) VALUES (:eventType, :aggregateType, :aggregateId, :payload::jsonb, gen_random_uuid(), gen_random_uuid())`,
      { replacements: { eventType, aggregateType, aggregateId, payload: JSON.stringify(payload) }, type: QueryTypes.INSERT, transaction }
    );
  }
}
