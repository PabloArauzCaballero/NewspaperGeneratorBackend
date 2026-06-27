import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SecurityAdminService } from './security-admin.service';
import { loginAttemptsQuerySchema, LoginAttemptsQueryDto, workerRunsQuerySchema, WorkerRunsQueryDto } from './security.schemas';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('admin-security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/security')
export class SecurityAdminController {
  constructor(private readonly service: SecurityAdminService) {}

  @Get('login-attempts')
  listLoginAttempts(@Query(new ZodValidationPipe(loginAttemptsQuerySchema)) query: LoginAttemptsQueryDto) {
    return this.service.listLoginAttempts(query);
  }

  @Get('users/:id/refresh-tokens')
  listRefreshTokens(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }) {
    return this.service.listRefreshTokens(params.id);
  }

  @Post('users/:id/revoke-refresh-tokens')
  revokeRefreshTokens(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Req() request: RequestWithUser) {
    return this.service.revokeRefreshTokens(params.id, request.user.id);
  }

  @Get('worker-runs')
  listWorkerRuns(@Query(new ZodValidationPipe(workerRunsQuerySchema)) query: WorkerRunsQueryDto) {
    return this.service.listWorkerRuns(query);
  }
}
