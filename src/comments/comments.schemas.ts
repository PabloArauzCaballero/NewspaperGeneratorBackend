import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().trim().min(2).max(2000),
  parentCommentId: z.string().uuid().optional()
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const moderateCommentSchema = z.object({
  status: z.enum(['approved', 'rejected', 'hidden']),
  reason: z.string().trim().min(3).max(500).optional()
});
export type ModerateCommentDto = z.infer<typeof moderateCommentSchema>;
