import { z } from 'zod';

export const loginAttemptsQuerySchema = z.object({
  email: z.string().trim().email().max(220).transform((value) => value.toLowerCase()).optional(),
  success: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});
export type LoginAttemptsQueryDto = z.infer<typeof loginAttemptsQuerySchema>;

export const workerRunsQuerySchema = z.object({
  workerName: z.string().trim().min(3).max(120).optional(),
  status: z.enum(['started', 'succeeded', 'failed', 'skipped']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});
export type WorkerRunsQueryDto = z.infer<typeof workerRunsQuerySchema>;
