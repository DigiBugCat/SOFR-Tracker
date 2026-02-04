// SOFR Tracker API Worker
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { runSync, backfill } from './sync';
import { HTML, CSS, JS } from './static';
import type { Env, SofrRate, EffrRate, PolicyRate, RrpOperation } from './types';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Valid view paths
const VIEWS = new Set([
  'corridor', 'sofr-percentile', 'sofr-bands',
  'sofr-rrp', 'effr-rrp', 'rrp-volume', 'sofr-volume',
]);

// Static assets (must be before /:view catch-all)
app.get('/styles.css', (c) => {
  return c.text(CSS, 200, { 'Content-Type': 'text/css' });
});

app.get('/charts.js', (c) => {
  return c.text(JS, 200, { 'Content-Type': 'application/javascript' });
});

// Serve dashboard for / and all view paths
app.get('/', (c) => {
  return c.html(HTML);
});

app.get('/:view', (c) => {
  const view = c.req.param('view');
  if (VIEWS.has(view)) {
    return c.html(HTML);
  }
  return c.notFound();
});

// Get rates with date range
app.get('/api/rates', async (c) => {
  const start = c.req.query('start') || getDefaultStartDate();
  const end = c.req.query('end') || getToday();

  const [sofr, effr, policy] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM sofr_rates WHERE date >= ? AND date <= ? ORDER BY date')
      .bind(start, end)
      .all<SofrRate>(),
    c.env.DB.prepare('SELECT * FROM effr_rates WHERE date >= ? AND date <= ? ORDER BY date')
      .bind(start, end)
      .all<EffrRate>(),
    c.env.DB.prepare('SELECT * FROM policy_rates WHERE date >= ? AND date <= ? ORDER BY date')
      .bind(start, end)
      .all<PolicyRate>(),
  ]);

  return c.json({
    sofr: sofr.results,
    effr: effr.results,
    policy: policy.results,
  });
});

// Get calculated spreads
app.get('/api/spreads', async (c) => {
  const type = c.req.query('type') || 'sofr-percentile';
  const start = c.req.query('start') || getDefaultStartDate();
  const end = c.req.query('end') || getToday();

  let query: string;
  switch (type) {
    case 'sofr-percentile':
      query = `
        SELECT date, (p99 - p1) as value
        FROM sofr_rates
        WHERE date >= ? AND date <= ? AND p99 IS NOT NULL AND p1 IS NOT NULL
        ORDER BY date
      `;
      break;
    case 'sofr-rrp':
      query = `
        SELECT s.date, (s.rate - p.rrp) as value
        FROM sofr_rates s
        JOIN policy_rates p ON s.date = p.date
        WHERE s.date >= ? AND s.date <= ? AND p.rrp IS NOT NULL
        ORDER BY s.date
      `;
      break;
    case 'effr-rrp':
      query = `
        SELECT e.date, (e.rate - p.rrp) as value
        FROM effr_rates e
        JOIN policy_rates p ON e.date = p.date
        WHERE e.date >= ? AND e.date <= ? AND p.rrp IS NOT NULL
        ORDER BY e.date
      `;
      break;
    default:
      return c.json({ error: 'Invalid spread type' }, 400);
  }

  const result = await c.env.DB.prepare(query).bind(start, end).all<{ date: string; value: number }>();

  return c.json(result.results);
});

// Get RRP volume data
app.get('/api/rrp', async (c) => {
  const start = c.req.query('start') || getDefaultStartDate();
  const end = c.req.query('end') || getToday();

  const result = await c.env.DB.prepare(
    'SELECT * FROM rrp_operations WHERE date >= ? AND date <= ? ORDER BY date'
  )
    .bind(start, end)
    .all<RrpOperation>();

  return c.json(result.results);
});

// Get SOFR volume data
app.get('/api/volume', async (c) => {
  const start = c.req.query('start') || getDefaultStartDate();
  const end = c.req.query('end') || getToday();

  const result = await c.env.DB.prepare(
    'SELECT date, volume_billions as value FROM sofr_rates WHERE date >= ? AND date <= ? AND volume_billions IS NOT NULL ORDER BY date'
  )
    .bind(start, end)
    .all<{ date: string; value: number }>();

  return c.json(result.results);
});

// Get quarter-end and tax deadline markers
app.get('/api/markers', (c) => {
  const year = new Date().getFullYear();
  const years = [year - 1, year, year + 1];

  const quarterEnds = years.flatMap((y) => [
    `${y}-03-31`,
    `${y}-06-30`,
    `${y}-09-30`,
    `${y}-12-31`,
  ]);

  const taxDeadlines = years.flatMap((y) => [
    `${y}-01-15`,
    `${y}-04-15`,
    `${y}-06-15`,
    `${y}-09-15`,
  ]);

  return c.json({ quarterEnds, taxDeadlines });
});

// Manual sync trigger
app.post('/api/sync', async (c) => {
  const lookback = parseInt(c.req.query('days') || '7');
  const result = await runSync(c.env, lookback);
  return c.json(result);
});

// Backfill endpoint
app.post('/api/backfill', async (c) => {
  const start = c.req.query('start');
  const end = c.req.query('end') || getToday();

  if (!start) {
    return c.json({ error: 'start date required' }, 400);
  }

  const result = await backfill(c.env, start, end);
  return c.json(result);
});

// Sync metadata
app.get('/api/status', async (c) => {
  const metadata = await c.env.DB.prepare('SELECT * FROM sync_metadata').all<{
    key: string;
    value: string;
    updated_at: string;
  }>();

  const counts = await c.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sofr_rates) as sofr_count,
      (SELECT COUNT(*) FROM effr_rates) as effr_count,
      (SELECT COUNT(*) FROM policy_rates) as policy_count,
      (SELECT COUNT(*) FROM rrp_operations) as rrp_count,
      (SELECT MIN(date) FROM sofr_rates) as earliest_date,
      (SELECT MAX(date) FROM sofr_rates) as latest_date
  `).first<{
    sofr_count: number;
    effr_count: number;
    policy_count: number;
    rrp_count: number;
    earliest_date: string;
    latest_date: string;
  }>();

  return c.json({
    metadata: Object.fromEntries(metadata.results.map((m) => [m.key, m.value])),
    counts,
  });
});

// Helper functions
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split('T')[0];
}

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runSync(env, 7));
  },
};
