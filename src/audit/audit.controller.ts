import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('admin-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/audit')
export class AuditAdminController {
  constructor(private readonly service: AuditService) {}
  @Get('logs')
  list() { return this.service.list(); }

  @Get('write-batches')
  listWriteBatches() { return this.service.listWriteBatches(); }
}
