import type * as z from 'zod';

export const nullToOptional = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .nullable()
    .transform((v) => v ?? undefined)
    .optional();
