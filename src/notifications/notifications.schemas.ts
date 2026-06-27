import { z } from 'zod';

export const updateNotificationPreferenceSchema = z.object({
  channel: z.enum(['in_app', 'email', 'push']).default('in_app'),
  categoryId: z.string().uuid().nullable().optional(),
  enabled: z.boolean(),
  publicNewsAlertsEnabled: z.boolean().default(true),
  premiumAlertsEnabled: z.boolean().default(true),
  premiumOnly: z.boolean().default(false)
});
export type UpdateNotificationPreferenceDto = z.infer<typeof updateNotificationPreferenceSchema>;
