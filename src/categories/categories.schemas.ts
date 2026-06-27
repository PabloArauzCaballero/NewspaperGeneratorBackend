import { z } from 'zod';
import { slugify } from '../common/utils/slugify';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true)
}).transform((value) => ({ ...value, slug: value.slug ? slugify(value.slug) : slugify(value.name) }));
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(140).optional().transform((value) => (value ? slugify(value) : undefined)),
  description: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional()
});
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
