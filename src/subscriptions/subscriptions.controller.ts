import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SubscriptionsService } from './subscriptions.service';
import { adminActivateSubscriptionSchema, AdminActivateSubscriptionDto, cancelSubscriptionSchema, CancelSubscriptionDto, checkoutSchema, CheckoutDto } from './subscriptions.schemas';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOkResponse({ description: 'Active subscription plans seeded for demo/testing.' })
  listPlans() { return this.subscriptionsService.listActivePlans(); }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) { return this.subscriptionsService.me(req.user.id); }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@Body(new ZodValidationPipe(checkoutSchema)) dto: CheckoutDto, @Req() req: RequestWithUser) {
    return this.subscriptionsService.checkout(dto, req.user.id);
  }
}

@ApiTags('admin-subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/subscriptions')
export class SubscriptionsAdminController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post('activate-manual')
  activateManual(@Body(new ZodValidationPipe(adminActivateSubscriptionSchema)) dto: AdminActivateSubscriptionDto, @Req() req: RequestWithUser) {
    return this.service.activateManual(dto, req.user.id);
  }

  @Post(':id/cancel')
  cancel(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(cancelSubscriptionSchema)) dto: CancelSubscriptionDto, @Req() req: RequestWithUser) {
    return this.service.cancel(params.id, dto, req.user.id);
  }
}
