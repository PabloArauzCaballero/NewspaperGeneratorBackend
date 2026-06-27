import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createTagSchema, CreateTagDto } from './tags.schemas';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsPublicController {
  constructor(private readonly service: TagsService) {}
  @Get()
  list() { return this.service.list(); }
}

@ApiTags('admin-tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor', 'journalist')
@Controller('admin/tags')
export class TagsAdminController {
  constructor(private readonly service: TagsService) {}
  @Get()
  list() { return this.service.list(); }
  @Post()
  create(@Body(new ZodValidationPipe(createTagSchema)) dto: CreateTagDto) { return this.service.create(dto); }
}
