import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { invalidateCacheSchema, InvalidateCacheDto } from './cache-invalidation.schemas';
import { CacheInvalidationService } from './cache-invalidation.service';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('admin-cache-invalidation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/cache-invalidation')
export class CacheInvalidationAdminController {
  constructor(private readonly service: CacheInvalidationService) {}

  @Get('jobs')
  list() { return this.service.listJobs(); }

  @Post('articles/:id')
  invalidateArticle(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(invalidateCacheSchema)) dto: InvalidateCacheDto, @Req() req: RequestWithUser) {
    return this.service.invalidateArticle(params.id, dto, req.user.id);
  }
}
