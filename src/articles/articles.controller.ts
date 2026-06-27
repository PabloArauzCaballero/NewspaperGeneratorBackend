import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ArticlesService } from './articles.service';
import {
  adminArticleQuerySchema,
  AdminArticleQueryDto,
  attachMediaSchema,
  AttachMediaDto,
  createArticleSchema,
  CreateArticleDto,
  publicArticleQuerySchema,
  PublicArticleQueryDto,
  requestChangesSchema,
  RequestChangesDto,
  scheduleArticleSchema,
  ScheduleArticleDto,
  updateArticleSchema,
  UpdateArticleDto
} from './articles.schemas';

type RequestWithOptionalUser = Request & { user?: AuthenticatedUser };
type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOkResponse({ description: 'Public listing. Premium bodies are never exposed here.' })
  list(@Query(new ZodValidationPipe(publicArticleQuerySchema)) query: PublicArticleQueryDto) {
    return this.articlesService.listPublishedArticles(query);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Public/premium article detail with paywall redaction.' })
  getBySlug(@Param('slug') slug: string, @Req() request: RequestWithOptionalUser) {
    return this.articlesService.getPublishedArticleBySlug(slug, request.user);
  }
}

@ApiTags('premium-articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('premium/articles')
export class PremiumArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get(':slug')
  getPremiumBySlug(@Param('slug') slug: string, @Req() request: RequestWithUser) {
    return this.articlesService.getPremiumArticleBySlug(slug, request.user);
  }
}

@ApiTags('admin-articles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor', 'journalist')
@Controller('admin/articles')
export class ArticlesAdminController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(adminArticleQuerySchema)) query: AdminArticleQueryDto) {
    return this.articlesService.listAdmin(query);
  }

  @Get(':id')
  get(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }) {
    return this.articlesService.getAdmin(params.id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createArticleSchema)) dto: CreateArticleDto, @Req() request: RequestWithUser) {
    return this.articlesService.create(dto, request.user);
  }

  @Patch(':id')
  update(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(updateArticleSchema)) dto: UpdateArticleDto, @Req() request: RequestWithUser) {
    return this.articlesService.update(params.id, dto, request.user);
  }

  @Post(':id/submit-review')
  submitReview(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() request: RequestWithUser) {
    return this.articlesService.submitReview(params.id, request.user);
  }

  @Post(':id/request-changes')
  @Roles('admin', 'editor')
  requestChanges(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(requestChangesSchema)) dto: RequestChangesDto, @Req() request: RequestWithUser) {
    return this.articlesService.requestChanges(params.id, dto, request.user);
  }

  @Post(':id/approve')
  @Roles('admin', 'editor')
  approve(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() request: RequestWithUser) {
    return this.articlesService.approve(params.id, request.user);
  }

  @Post(':id/schedule')
  @Roles('admin', 'editor')
  schedule(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(scheduleArticleSchema)) dto: ScheduleArticleDto, @Req() request: RequestWithUser) {
    return this.articlesService.schedule(params.id, dto, request.user);
  }

  @Post(':id/publish')
  @Roles('admin', 'editor')
  publish(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() request: RequestWithUser) {
    return this.articlesService.publish(params.id, request.user);
  }

  @Post(':id/unpublish')
  @Roles('admin', 'editor')
  unpublish(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() request: RequestWithUser) {
    return this.articlesService.unpublish(params.id, request.user);
  }

  @Post(':id/archive')
  @Roles('admin', 'editor')
  archive(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() request: RequestWithUser) {
    return this.articlesService.archive(params.id, request.user);
  }

  @Post(':id/media')
  attachMedia(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(attachMediaSchema)) dto: AttachMediaDto, @Req() request: RequestWithUser) {
    return this.articlesService.attachMedia(params.id, dto, request.user);
  }
}
