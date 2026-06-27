import { z } from 'zod';

export const adSlotsQuerySchema = z.object({
  articleSlug: z.string().trim().min(1).optional(),
  articleId: z.string().uuid().optional()
}).refine((value) => value.articleSlug || value.articleId, { message: 'articleSlug or articleId is required' });
export type AdSlotsQueryDto = z.infer<typeof adSlotsQuerySchema>;

export const createAdvertisementSchema = z.object({
  placementId: z.string().uuid(),
  title: z.string().trim().min(3).max(160).refine((value) => !value.toLowerCase().includes('popup'), 'Popup ads are not allowed'),
  imageUrl: z.string().url(),
  targetUrl: z.string().url(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  categoryIds: z.array(z.string().uuid()).max(20).default([])
});
export type CreateAdvertisementDto = z.infer<typeof createAdvertisementSchema>;

export const updateAdvertisementSchema = z.object({
  placementId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(160).optional().refine((value) => value === undefined || !value.toLowerCase().includes('popup'), 'Popup ads are not allowed'),
  imageUrl: z.string().url().optional(),
  targetUrl: z.string().url().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  categoryIds: z.array(z.string().uuid()).max(20).optional()
});
export type UpdateAdvertisementDto = z.infer<typeof updateAdvertisementSchema>;
