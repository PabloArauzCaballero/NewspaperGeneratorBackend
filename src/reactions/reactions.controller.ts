import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ReactionsService } from './reactions.service';
import { upsertReactionSchema, UpsertReactionDto } from './reactions.schemas';

type RequestWithOptionalUser = Request & { user?: AuthenticatedUser };
type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('reactions')
@Controller('articles/:id/reactions')
export class ReactionsController {
  constructor(private readonly service: ReactionsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  summary(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() req: RequestWithOptionalUser) {
    return this.service.summary(params.id, req.user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  upsert(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(upsertReactionSchema)) dto: UpsertReactionDto, @Req() req: RequestWithUser) {
    return this.service.upsert(params.id, dto, req.user);
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() req: RequestWithUser) {
    return this.service.remove(params.id, req.user);
  }
}
