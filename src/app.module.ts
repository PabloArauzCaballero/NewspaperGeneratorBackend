import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdsModule } from './ads/ads.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ArticlesModule } from './articles/articles.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CacheInvalidationModule } from './cache-invalidation/cache-invalidation.module';
import { CacheModule } from './cache/cache.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';
import { validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ReactionsModule } from './reactions/reactions.module';
import { RolesPermissionsModule } from './roles-permissions/roles-permissions.module';
import { SearchIndexingModule } from './search-indexing/search-indexing.module';
import { SecurityModule } from './security/security.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TagsModule } from './tags/tags.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesPermissionsModule,
    ArticlesModule,
    CategoriesModule,
    TagsModule,
    MediaModule,
    SubscriptionsModule,
    PaymentsModule,
    CommentsModule,
    ReactionsModule,
    AdsModule,
    NotificationsModule,
    EventsModule,
    AuditModule,
    AnalyticsModule,
    SearchIndexingModule,
    CacheInvalidationModule,
    SecurityModule
  ]
})
export class AppModule {}
