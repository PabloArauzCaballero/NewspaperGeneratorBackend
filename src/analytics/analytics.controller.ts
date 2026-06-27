import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AnalyticsService } from './analytics.service';
import { articleViewSchema, ArticleViewDto } from './analytics.schemas';

type RequestWithOptionalUser = Request & { user?: AuthenticatedUser };

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Post('articles/:id/view')
  @UseGuards(OptionalJwtAuthGuard)
  trackView(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(articleViewSchema)) dto: ArticleViewDto, @Req() req: RequestWithOptionalUser) {
    return this.service.trackArticleView(params.id, dto, req.user);
  }
}

@ApiTags('admin-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/analytics')
export class AnalyticsAdminController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('articles')
  articles() { return this.service.articleSummaryAdmin(); }
}
