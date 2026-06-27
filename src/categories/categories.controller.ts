import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CategoriesService } from './categories.service';
import { createCategorySchema, CreateCategoryDto, updateCategorySchema, UpdateCategoryDto } from './categories.schemas';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('categories')
@Controller('categories')
export class CategoriesPublicController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list() { return this.service.listPublic(); }
}

@ApiTags('admin-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list() { return this.service.listAdmin(); }

  @Post()
  create(@Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(updateCategorySchema)) dto: UpdateCategoryDto, @Req() req: RequestWithUser) {
    return this.service.update(params.id, dto, req.user.id);
  }
}
