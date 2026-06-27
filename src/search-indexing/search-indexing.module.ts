import { Module } from '@nestjs/common';
import { SearchIndexingAdminController } from './search-indexing.controller';
import { SearchIndexingService } from './search-indexing.service';

@Module({ controllers: [SearchIndexingAdminController], providers: [SearchIndexingService] })
export class SearchIndexingModule {}
