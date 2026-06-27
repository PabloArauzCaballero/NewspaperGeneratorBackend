import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid()
});

export type UuidParamDto = z.infer<typeof uuidParamSchema>;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
