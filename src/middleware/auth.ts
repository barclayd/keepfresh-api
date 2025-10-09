import { createMiddleware } from 'hono/factory';
import type { HonoEnvironment } from '@/types/hono';

export const authMiddleware = createMiddleware<HonoEnvironment>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    const jwt = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!jwt) {
      return c.json(
        {
          error: `Unauthorized. Missing Bearer token`,
        },
        401,
      );
    }

    const { data, error } = await c.get('supabase').auth.getUser(jwt);

    if (error || !data.user?.id) {
      return c.json(
        {
          error: `Unauthorized`,
        },
        401,
      );
    }

    await c
      .get('supabase')
      .from('users')
      .upsert({ id: data.user.id }, { onConflict: 'id' });

    c.set('userId', data.user.id);

    await next();
  },
);
