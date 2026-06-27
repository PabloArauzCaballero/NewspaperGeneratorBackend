import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from './notifications.service';
import { updateNotificationPreferenceSchema, UpdateNotificationPreferenceDto } from './notifications.schemas';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  listMine(@Req() req: RequestWithUser) { return this.service.listMine(req.user.id); }

  @Post(':id/read')
  markRead(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() req: RequestWithUser) {
    return this.service.markRead(params.id, req.user.id);
  }

  @Get('preferences')
  preferences(@Req() req: RequestWithUser) { return this.service.getPreferences(req.user.id); }

  @Post('preferences')
  upsertPreference(@Body(new ZodValidationPipe(updateNotificationPreferenceSchema)) dto: UpdateNotificationPreferenceDto, @Req() req: RequestWithUser) {
    return this.service.upsertPreference(req.user.id, dto);
  }
}

@ApiTags('admin-notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/notifications')
export class NotificationsAdminController {
  constructor(private readonly service: NotificationsService) {}

  @Get('batches')
  batches() { return this.service.listBatchesAdmin(); }
}
