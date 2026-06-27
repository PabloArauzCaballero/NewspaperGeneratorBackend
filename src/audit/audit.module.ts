import { Module } from '@nestjs/common';
import { AuditAdminController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({ controllers: [AuditAdminController], providers: [AuditService] })
export class AuditModule {}
