import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'pending_verification', 'suspended', 'blocked', 'deleted'])
});
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;

export const roleNameSchema = z.object({
  roleName: z.enum(['admin', 'editor', 'journalist', 'commercial_editor', 'reader'])
});
export type RoleNameDto = z.infer<typeof roleNameSchema>;
