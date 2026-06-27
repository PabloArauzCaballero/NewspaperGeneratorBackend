import { z } from 'zod';

export const paymentWebhookSchema = z.object({
  provider: z.string().trim().min(2).max(80).default('manual_demo'),
  externalEventId: z.string().trim().min(3).max(180),
  eventType: z.enum(['payment.succeeded', 'payment.failed', 'payment.cancelled', 'payment.refunded']),
  externalReference: z.string().trim().min(3).max(160),
  amount: z.number().nonnegative().optional(),
  currency: z.string().trim().min(3).max(12).optional(),
  rawPayload: z.record(z.unknown()).default({})
});
export type PaymentWebhookDto = z.infer<typeof paymentWebhookSchema>;
