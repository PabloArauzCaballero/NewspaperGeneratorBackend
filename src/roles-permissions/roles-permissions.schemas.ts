import { z } from 'zod';

export const createPermissionSchema = z.object({
  code: z.string().trim().min(3).max(120).regex(/^[a-z0-9_.:-]+$/),
  module: z.string().trim().min(2).max(80),
  description: z.string().trim().max(255).optional()
});
export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;

export const assignPermissionSchema = z.object({
  permissionCode: z.string().trim().min(3).max(120)
});
export type AssignPermissionDto = z.infer<typeof assignPermissionSchema>;
