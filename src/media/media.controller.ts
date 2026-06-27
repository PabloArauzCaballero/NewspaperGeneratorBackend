import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { createMediaAssetSchema, CreateMediaAssetDto } from './media.schemas';
import { MediaService } from './media.service';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('admin-media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor', 'journalist')
@Controller('admin/media')
export class MediaAdminController {
  constructor(private readonly service: MediaService) {}

  @Get()
  list() { return this.service.list(); }

  @Post()
  create(@Body(new ZodValidationPipe(createMediaAssetSchema)) dto: CreateMediaAssetDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.id);
  }
}
