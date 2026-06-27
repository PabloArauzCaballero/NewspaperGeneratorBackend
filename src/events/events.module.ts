import { Module } from '@nestjs/common';
import { EventsAdminController } from './events.controller';
import { EventsService } from './events.service';

@Module({ controllers: [EventsAdminController], providers: [EventsService] })
export class EventsModule {}
