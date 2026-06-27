import { z } from 'zod';

export const checkoutSchema = z.object({
  planId: z.string().uuid()
});
export type CheckoutDto = z.infer<typeof checkoutSchema>;

export const adminActivateSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  reason: z.string().trim().min(3).max(300).default('Activación manual demo')
});
export type AdminActivateSubscriptionDto = z.infer<typeof adminActivateSubscriptionSchema>;

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().min(3).max(300).optional()
});
export type CancelSubscriptionDto = z.infer<typeof cancelSubscriptionSchema>;
