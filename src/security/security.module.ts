import { Module } from '@nestjs/common';
import { SecurityAdminController } from './security-admin.controller';
import { SecurityAdminService } from './security-admin.service';

@Module({ controllers: [SecurityAdminController], providers: [SecurityAdminService] })
export class SecurityModule {}
