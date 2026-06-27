import { z } from 'zod';
import { slugify } from '../common/utils/slugify';

export const createTagSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).optional()
}).transform((value) => ({ ...value, slug: value.slug ? slugify(value.slug) : slugify(value.name) }));
export type CreateTagDto = z.infer<typeof createTagSchema>;
