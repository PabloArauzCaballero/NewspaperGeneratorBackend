import { Module } from '@nestjs/common';
import { AdsAdminController, AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({ controllers: [AdsController, AdsAdminController], providers: [AdsService] })
export class AdsModule {}
