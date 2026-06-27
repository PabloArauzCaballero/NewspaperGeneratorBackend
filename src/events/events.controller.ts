import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../common/schemas/query.schemas';
import { dispatchEventsSchema, DispatchEventsDto, retryEventSchema, RetryEventDto, workerRunSchema, WorkerRunDto } from './events.schemas';
import { EventsService } from './events.service';

const outboxQuerySchema = z.object({ status: z.enum(['pending', 'published', 'failed', 'consumed']).optional() });

@ApiTags('admin-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/events')
export class EventsAdminController {
  constructor(private readonly service: EventsService) {}

  @Get('outbox')
  outbox(@Query(new ZodValidationPipe(outboxQuerySchema)) query: { status?: string }) { return this.service.listOutbox(query.status); }

  @Get('inbox')
  inbox() { return this.service.listInbox(); }

  @Post('dispatch-pending')
  dispatchPending(@Body(new ZodValidationPipe(dispatchEventsSchema)) dto: DispatchEventsDto) { return this.service.dispatchPending(dto.limit); }

  @Post('worker/run-once')
  runWorkerOnce(@Body(new ZodValidationPipe(workerRunSchema)) dto: WorkerRunDto) {
    return this.service.runWorkerBatch({ limit: dto.limit, workerName: dto.workerName });
  }

  @Post('outbox/:id/retry')
  retry(@Param(new ZodValidationPipe(uuidParamSchema)) params: { id: string }, @Body(new ZodValidationPipe(retryEventSchema)) dto: RetryEventDto) {
    return this.service.retry(params.id, dto.reason);
  }
}
