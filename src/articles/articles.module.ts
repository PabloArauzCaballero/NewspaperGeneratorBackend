import { Module } from '@nestjs/common';
import { ArticlesAdminController, ArticlesController, PremiumArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  controllers: [ArticlesController, PremiumArticlesController, ArticlesAdminController],
  providers: [ArticlesService],
  exports: [ArticlesService]
})
export class ArticlesModule {}
