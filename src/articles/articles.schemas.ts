import { z } from 'zod';
import { slugify } from '../common/utils/slugify';

export const articleAccessTypeSchema = z.enum(['public', 'premium', 'internal_only']);
export const articleTypeSchema = z.enum(['news', 'opinion', 'interview', 'report', 'analysis']);

export const publicArticleQuerySchema = z.object({
  category: z.string().trim().min(1).max(140).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  accessType: z.enum(['public', 'premium']).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
export type PublicArticleQueryDto = z.infer<typeof publicArticleQuerySchema>;

export const adminArticleQuerySchema = z.object({
  status: z.enum(['draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'unpublished', 'archived']).optional(),
  accessType: z.enum(['public', 'premium', 'internal_only']).optional(),
  authorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
export type AdminArticleQueryDto = z.infer<typeof adminArticleQuerySchema>;

export const createArticleSchema = z.object({
  title: z.string().trim().min(5).max(220),
  slug: z.string().trim().min(5).max(240).optional(),
  summary: z.string().trim().min(20).max(2000),
  body: z.string().trim().min(50),
  audioTranscript: z.string().trim().max(10000).nullable().optional(),
  categoryId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).max(20).default([]),
  articleType: articleTypeSchema.default('news'),
  accessType: articleAccessTypeSchema.default('public'),
  commentsEnabled: z.boolean().default(true),
  reactionsEnabled: z.boolean().default(true)
}).transform((value) => ({ ...value, slug: value.slug ? slugify(value.slug) : slugify(value.title) }));
export type CreateArticleDto = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z.object({
  title: z.string().trim().min(5).max(220).optional(),
  slug: z.string().trim().min(5).max(240).optional().transform((value) => (value ? slugify(value) : undefined)),
  summary: z.string().trim().min(20).max(2000).optional(),
  body: z.string().trim().min(50).optional(),
  audioTranscript: z.string().trim().max(10000).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
  articleType: articleTypeSchema.optional(),
  accessType: articleAccessTypeSchema.optional(),
  commentsEnabled: z.boolean().optional(),
  reactionsEnabled: z.boolean().optional(),
  changeReason: z.string().trim().max(500).optional()
});
export type UpdateArticleDto = z.infer<typeof updateArticleSchema>;

export const requestChangesSchema = z.object({
  reason: z.string().trim().min(5).max(800)
});
export type RequestChangesDto = z.infer<typeof requestChangesSchema>;

export const scheduleArticleSchema = z.object({
  publishAt: z.string().datetime()
});
export type ScheduleArticleDto = z.infer<typeof scheduleArticleSchema>;

export const attachMediaSchema = z.object({
  mediaAssetId: z.string().uuid(),
  displayOrder: z.number().int().min(0).default(0),
  isCover: z.boolean().default(false)
});
export type AttachMediaDto = z.infer<typeof attachMediaSchema>;
