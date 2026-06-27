import { Module } from '@nestjs/common';
import { CommentsAdminController, CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({ controllers: [CommentsController, CommentsAdminController], providers: [CommentsService] })
export class CommentsModule {}
