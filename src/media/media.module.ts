import { Module } from '@nestjs/common';
import { MediaAdminController } from './media.controller';
import { MediaService } from './media.service';

@Module({ controllers: [MediaAdminController], providers: [MediaService] })
export class MediaModule {}
