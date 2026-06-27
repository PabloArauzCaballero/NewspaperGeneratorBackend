import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { roleNameSchema, updateUserStatusSchema, RoleNameDto, UpdateUserStatusDto } from './users.schemas';
import { UsersService } from './users.service';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  get(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }) {
    return this.usersService.getUser(params.id);
  }

  @Patch(':id/status')
  @Roles('admin')
  updateStatus(
    @Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateUserStatusSchema)) dto: UpdateUserStatusDto,
    @Req() req: RequestWithUser
  ) {
    return this.usersService.updateStatus(params.id, dto, req.user.id);
  }

  @Post(':id/roles')
  @Roles('admin')
  addRole(
    @Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(roleNameSchema)) dto: RoleNameDto,
    @Req() req: RequestWithUser
  ) {
    return this.usersService.addRole(params.id, dto.roleName, req.user.id);
  }

  @Post(':id/roles/remove')
  @Roles('admin')
  removeRole(
    @Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(roleNameSchema)) dto: RoleNameDto,
    @Req() req: RequestWithUser
  ) {
    return this.usersService.removeRole(params.id, dto.roleName, req.user.id);
  }
}
