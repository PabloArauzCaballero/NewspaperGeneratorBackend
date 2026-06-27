import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AdsService } from './ads.service';
import { adSlotsQuerySchema, AdSlotsQueryDto, createAdvertisementSchema, CreateAdvertisementDto, updateAdvertisementSchema, UpdateAdvertisementDto } from './ads.schemas';

type RequestWithOptionalUser = Request & { user?: AuthenticatedUser };
type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('slots')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ description: 'Returns discreet ads for public articles. Premium articles always return empty ads.' })
  getSlots(@Query(new ZodValidationPipe(adSlotsQuerySchema)) query: AdSlotsQueryDto, @Req() req: RequestWithOptionalUser) {
    return this.adsService.getSlotsForArticle(query, req.user?.id);
  }
}

@ApiTags('admin-ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'commercial_editor')
@Controller('admin/ads')
export class AdsAdminController {
  constructor(private readonly service: AdsService) {}

  @Get()
  list() { return this.service.listAdmin(); }

  @Get('placements')
  placements() { return this.service.listPlacements(); }

  @Post()
  create(@Body(new ZodValidationPipe(createAdvertisementSchema)) dto: CreateAdvertisementDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(updateAdvertisementSchema)) dto: UpdateAdvertisementDto, @Req() req: RequestWithUser) {
    return this.service.update(params.id, dto, req.user.id);
  }

  @Post(':id/activate')
  activate(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() req: RequestWithUser) {
    return this.service.activate(params.id, req.user.id);
  }

  @Post(':id/pause')
  pause(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() req: RequestWithUser) {
    return this.service.pause(params.id, req.user.id);
  }
}
