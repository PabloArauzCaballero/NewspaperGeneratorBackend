import { Module } from '@nestjs/common';
import { TagsAdminController, TagsPublicController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({ controllers: [TagsPublicController, TagsAdminController], providers: [TagsService] })
export class TagsModule {}
