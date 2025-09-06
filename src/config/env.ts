import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_KEY: z.string().min(1, 'SUPABASE_KEY is required'),
  SUPABASE_SERVICE_ROLE: z.string().min(1, 'SUPABASE_SERVICE_ROLE is required'),
});

export const env = envSchema.parse(process.env);
