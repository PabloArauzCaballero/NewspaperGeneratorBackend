import { Module } from '@nestjs/common';
import { CacheInvalidationAdminController } from './cache-invalidation.controller';
import { CacheInvalidationService } from './cache-invalidation.service';

@Module({ controllers: [CacheInvalidationAdminController], providers: [CacheInvalidationService] })
export class CacheInvalidationModule {}
