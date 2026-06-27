import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CommentsService } from './comments.service';
import { createCommentSchema, CreateCommentDto, moderateCommentSchema, ModerateCommentDto } from './comments.schemas';

type RequestWithOptionalUser = Request & { user?: AuthenticatedUser };
type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('comments')
@Controller('articles/:id/comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() req: RequestWithOptionalUser) {
    return this.service.listForArticle(params.id, req.user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(createCommentSchema)) dto: CreateCommentDto, @Req() req: RequestWithUser) {
    return this.service.create(params.id, dto, req.user);
  }
}

@ApiTags('admin-comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/comments')
export class CommentsAdminController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  list() { return this.service.listAdmin(); }

  @Post(':id/moderate')
  moderate(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(moderateCommentSchema)) dto: ModerateCommentDto, @Req() req: RequestWithUser) {
    return this.service.moderate(params.id, dto, req.user.id);
  }
}
