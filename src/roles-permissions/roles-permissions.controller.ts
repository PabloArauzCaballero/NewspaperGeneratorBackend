import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assignPermissionSchema, AssignPermissionDto, createPermissionSchema, CreatePermissionDto } from './roles-permissions.schemas';
import { RolesPermissionsService } from './roles-permissions.service';

const roleParamSchema = z.object({ roleName: z.enum(['admin', 'editor', 'journalist', 'commercial_editor', 'reader']) });

type RoleParamDto = z.infer<typeof roleParamSchema>;

@ApiTags('admin-roles-permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/roles-permissions')
export class RolesPermissionsController {
  constructor(private readonly service: RolesPermissionsService) {}

  @Get('roles')
  listRoles() {
    return this.service.listRoles();
  }

  @Get('permissions')
  listPermissions() {
    return this.service.listPermissions();
  }

  @Post('permissions')
  createPermission(@Body(new ZodValidationPipe(createPermissionSchema)) dto: CreatePermissionDto) {
    return this.service.createPermission(dto);
  }

  @Post('roles/:roleName/permissions')
  assignPermission(@Param(new ZodValidationPipe(roleParamSchema)) params: RoleParamDto, @Body(new ZodValidationPipe(assignPermissionSchema)) dto: AssignPermissionDto) {
    return this.service.assignPermission(params.roleName, dto.permissionCode);
  }

  @Delete('roles/:roleName/permissions')
  removePermission(@Param(new ZodValidationPipe(roleParamSchema)) params: RoleParamDto, @Body(new ZodValidationPipe(assignPermissionSchema)) dto: AssignPermissionDto) {
    return this.service.removePermission(params.roleName, dto.permissionCode);
  }
}
