import { z } from 'zod';

export const invalidateCacheSchema = z.object({
  reason: z.string().trim().min(3).max(300).default('Manual cache invalidation')
});
export type InvalidateCacheDto = z.infer<typeof invalidateCacheSchema>;
