import * as z from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE: z.string().min(1, 'SUPABASE_SERVICE_ROLE is required'),
  SUPABASE_JWT_SECRET: z
    .string()
    .min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});

export const env = envSchema.parse(process.env);
