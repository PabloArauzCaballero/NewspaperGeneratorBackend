import { Module } from '@nestjs/common';
import { NotificationsAdminController, NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({ controllers: [NotificationsController, NotificationsAdminController], providers: [NotificationsService] })
export class NotificationsModule {}
