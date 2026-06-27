import { z } from 'zod';

export const upsertReactionSchema = z.object({
  reactionType: z.enum(['like', 'love', 'interesting', 'concerned'])
});
export type UpsertReactionDto = z.infer<typeof upsertReactionSchema>;
