import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { UpdateNotificationPreferenceDto } from './notifications.schemas';

@Injectable()
export class NotificationsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async listMine(userId: string) {
    return this.sequelize.query(
      `
      SELECT n.id, n.title, n.message, n.channel, n.status, n.sent_at AS "sentAt", n.read_at AS "readAt", n.created_at AS "createdAt",
             a.id AS "articleId", a.slug AS "articleSlug", a.access_type AS "articleAccessType"
      FROM notifications n
      INNER JOIN articles a ON a.id = n.article_id
      WHERE n.user_id = :userId
      ORDER BY n.created_at DESC
      LIMIT 100;
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
  }

  async markRead(notificationId: string, userId: string) {
    const [row] = await this.sequelize.query<{ id: string }>(
      `UPDATE notifications SET status = 'read', read_at = now() WHERE id = :notificationId AND user_id = :userId RETURNING id`,
      { replacements: { notificationId, userId }, type: QueryTypes.SELECT }
    );
    if (!row) throw new NotFoundException('Notification not found');
    return this.listMine(userId);
  }

  async getPreferences(userId: string) {
    return this.sequelize.query(
      `
      SELECT id, category_id AS "categoryId", channel, premium_only AS "premiumOnly", enabled,
             public_news_alerts_enabled AS "publicNewsAlertsEnabled", premium_alerts_enabled AS "premiumAlertsEnabled"
      FROM user_notification_preferences
      WHERE user_id = :userId
      ORDER BY channel ASC;
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
  }

  async upsertPreference(userId: string, dto: UpdateNotificationPreferenceDto) {
    await this.sequelize.query(
      `
      INSERT INTO user_notification_preferences (user_id, category_id, channel, premium_only, enabled, public_news_alerts_enabled, premium_alerts_enabled)
      VALUES (:userId, :categoryId, :channel, :premiumOnly, :enabled, :publicNewsAlertsEnabled, :premiumAlertsEnabled)
      ON CONFLICT (user_id, category_id, channel)
      DO UPDATE SET premium_only = EXCLUDED.premium_only, enabled = EXCLUDED.enabled,
                    public_news_alerts_enabled = EXCLUDED.public_news_alerts_enabled,
                    premium_alerts_enabled = EXCLUDED.premium_alerts_enabled,
                    updated_at = now();
      `,
      {
        replacements: {
          userId,
          categoryId: dto.categoryId ?? null,
          channel: dto.channel,
          premiumOnly: dto.premiumOnly,
          enabled: dto.enabled,
          publicNewsAlertsEnabled: dto.publicNewsAlertsEnabled,
          premiumAlertsEnabled: dto.premiumAlertsEnabled
        },
        type: QueryTypes.INSERT
      }
    );
    return this.getPreferences(userId);
  }

  async listBatchesAdmin() {
    return this.sequelize.query(
      `
      SELECT nb.id, nb.article_id AS "articleId", a.title AS "articleTitle", nb.audience_type AS "audienceType",
             nb.status, nb.total_recipients AS "totalRecipients", nb.created_at AS "createdAt", nb.updated_at AS "updatedAt"
      FROM notification_batches nb
      INNER JOIN articles a ON a.id = nb.article_id
      ORDER BY nb.created_at DESC
      LIMIT 100;
      `,
      { type: QueryTypes.SELECT }
    );
  }
}
