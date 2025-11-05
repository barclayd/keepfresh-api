import type { Context } from 'hono';
import pino from 'pino';

// Create base logger with pretty printing in development
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// Create a child logger with request-specific context
export function createRequestLogger(c: Context) {
  const requestId = crypto.randomUUID();
  return logger.child({
    requestId,
    method: c.req.method,
    path: c.req.path,
  });
}

export default logger;
