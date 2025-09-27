import { createClient } from '@supabase/supabase-js';
import { createMiddleware } from 'hono/factory';
import { env } from '@/config/env';
import type { Database } from '@/types/database';
import type { HonoEnvironment } from '@/types/hono';

export const supabaseMiddleware = createMiddleware<HonoEnvironment>(
  async (c, next) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    c.set('supabase', supabase);

    await next();
  },
);
