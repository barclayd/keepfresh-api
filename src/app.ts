import { Hono } from 'hono';
import { createV1Routes } from '@/routes/v1';
import { createV2Routes } from '@/routes/v2';
import type { HonoEnvironment } from '@/types/hono';

const app = new Hono<HonoEnvironment>();

const v1App = createV1Routes();
const v2App = createV2Routes();

app.route('/v1', v1App);
app.route('/v2', v2App);

app.get('/health', (c) =>
  c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    versions: ['v1', 'v2'],
  }),
);

export default app;
