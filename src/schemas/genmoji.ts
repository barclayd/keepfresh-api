import * as z from 'zod';

export const GenmojiSchema = z.object({
  contentIdentifier: z.string(),
  contentDescription: z.string(),
  imageContent: z.base64(),
  contentType: z.string(),
});

export type Genmoji = z.infer<typeof GenmojiSchema>;
