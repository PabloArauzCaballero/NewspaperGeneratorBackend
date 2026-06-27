import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { SearchIndexingService } from './search-indexing.service';

@ApiTags('admin-search-indexing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/search-indexing')
export class SearchIndexingAdminController {
  constructor(private readonly service: SearchIndexingService) {}

  @Get('documents')
  list() { return this.service.listDocuments(); }

  @Post('articles/:id/rebuild')
  rebuild(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }) { return this.service.rebuildArticle(params.id); }
}
