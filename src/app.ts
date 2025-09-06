import { OpenAPIHono } from '@hono/zod-openapi';
import { createV1Routes } from '@/routes/v1';
import type { HonoEnvironment } from '@/types/hono';

const app = new OpenAPIHono<HonoEnvironment>();

const v1App = createV1Routes();

app.route('/v1', v1App);

app.get('/health', (c) =>
  c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    versions: ['v1'],
  }),
);

export default app;
