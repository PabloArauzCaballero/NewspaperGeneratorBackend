import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { paymentWebhookSchema, PaymentWebhookDto } from './payments.schemas';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('webhook')
  webhook(@Body(new ZodValidationPipe(paymentWebhookSchema)) dto: PaymentWebhookDto) {
    return this.service.webhook(dto);
  }
}

@ApiTags('admin-payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  list() { return this.service.listAdmin(); }
}
