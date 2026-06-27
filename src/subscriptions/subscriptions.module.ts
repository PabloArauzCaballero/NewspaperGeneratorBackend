import { Module } from '@nestjs/common';
import { SubscriptionsAdminController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionsController, SubscriptionsAdminController],
  providers: [SubscriptionsService]
})
export class SubscriptionsModule {}
