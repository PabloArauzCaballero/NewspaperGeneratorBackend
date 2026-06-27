import { z } from 'zod';

export const dispatchEventsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10)
});
export type DispatchEventsDto = z.infer<typeof dispatchEventsSchema>;

export const retryEventSchema = z.object({
  reason: z.string().trim().min(3).max(300).default('Manual retry')
});
export type RetryEventDto = z.infer<typeof retryEventSchema>;


export const workerRunSchema = z.object({
  limit: z.number().int().min(1).max(200).default(25),
  workerName: z.string().trim().min(3).max(120).default('event-outbox-worker')
});
export type WorkerRunDto = z.infer<typeof workerRunSchema>;
