import { z } from 'zod';

export const createMediaAssetSchema = z.object({
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
  url: z.string().url().max(2000),
  caption: z.string().trim().max(220).optional(),
  altText: z.string().trim().max(220).optional(),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().min(0).max(100 * 1024 * 1024)
});
export type CreateMediaAssetDto = z.infer<typeof createMediaAssetSchema>;
