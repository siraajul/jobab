import { z } from 'zod';

export const FakeMessageBodySchema = z
  .object({
    pageId: z.string().min(1),
    customerId: z.string().min(1),
    text: z.string().max(4000).default(''),
    imageUrls: z.array(z.string().url()).max(8).optional(),
  })
  .refine((b) => b.text.length > 0 || (b.imageUrls && b.imageUrls.length > 0), {
    message: 'either text or imageUrls is required',
  });
export type FakeMessageBody = z.infer<typeof FakeMessageBodySchema>;
