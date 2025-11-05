import { createMiddleware } from 'hono/factory';
import type { HonoEnvironment } from '@/types/hono';
import { verifySupabaseJWT } from '@/utils/jwt';
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

    try {
      const verifyStartTime = performance.now();
      const payload = await verifySupabaseJWT(jwt);
      const verifyDuration = performance.now() - verifyStartTime;

      log.info({ verifyDuration }, 'Local JWT verification completed');

      c.set('userId', payload.sub);
      c.set('requestId', requestId);

      const totalAuthDuration = performance.now() - authStartTime;
      log.info(
        { totalAuthDuration, userId: payload.sub, method: 'local-jwt' },
        'Auth middleware completed (local validation)',
      );

      await next();
    } catch (error) {
      log.warn(
        { error: error instanceof Error ? error.message : error },
        'JWT verification failed',
      );
      return c.json(
        {
          error: `Unauthorized`,
        },
        401,
      );
    }
  },
);
