import { Module } from '@nestjs/common';
import { PaymentsAdminController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({ controllers: [PaymentsController, PaymentsAdminController], providers: [PaymentsService] })
export class PaymentsModule {}
