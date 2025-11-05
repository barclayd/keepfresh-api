import { createMiddleware } from 'hono/factory';
import type { HonoEnvironment } from '@/types/hono';
import logger from '@/utils/logger';

export const authMiddleware = createMiddleware<HonoEnvironment>(
  async (c, next) => {
    const authStartTime = performance.now();
    const requestId = crypto.randomUUID();
    const log = logger.child({ requestId, middleware: 'auth' });

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

    const getUserStartTime = performance.now();
    const { data, error } = await c.get('supabase').auth.getUser(jwt);
    const getUserDuration = performance.now() - getUserStartTime;

    log.info({ getUserDuration }, 'Supabase getUser completed');

    if (error || !data.user?.id) {
      return c.json(
        {
          error: `Unauthorized`,
        },
        401,
      );
    }

    c.set('userId', data.user.id);
    c.set('requestId', requestId);

    const totalAuthDuration = performance.now() - authStartTime;
    log.info(
      { totalAuthDuration, userId: data.user.id },
      'Auth middleware completed',
    );

    await next();
  },
);
