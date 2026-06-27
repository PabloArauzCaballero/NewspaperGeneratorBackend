import { z } from 'zod';

export const articleViewSchema = z.object({
  visitorHash: z.string().trim().min(6).max(160).optional(),
  userAgent: z.string().trim().max(1000).optional(),
  ipAddress: z.string().ip().optional()
});
export type ArticleViewDto = z.infer<typeof articleViewSchema>;
