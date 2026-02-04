// Cron sync job for fetching and storing rate data

import { fetchSofr, fetchEffr, fetchRrpOperations } from './lib/nyfed';
import { fetchPolicyRates } from './lib/fred';
import type { Env } from './types';

// Get date string in YYYY-MM-DD format
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get date N days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Upsert SOFR rates
async function syncSofr(db: D1Database, startDate: string, endDate: string): Promise<number> {
  const data = await fetchSofr(startDate, endDate);

  if (data.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO sofr_rates (date, rate, p1, p25, p75, p99, volume_billions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      rate = excluded.rate,
      p1 = excluded.p1,
      p25 = excluded.p25,
      p75 = excluded.p75,
      p99 = excluded.p99,
      volume_billions = excluded.volume_billions
  `);

  const batch = data.map((row) =>
    stmt.bind(row.date, row.rate, row.p1, row.p25, row.p75, row.p99, row.volume_billions)
  );

  await db.batch(batch);
  return data.length;
}

// Upsert EFFR rates
async function syncEffr(db: D1Database, startDate: string, endDate: string): Promise<number> {
  const data = await fetchEffr(startDate, endDate);

  if (data.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO effr_rates (date, rate, p1, p25, p75, p99, target_low, target_high, volume_billions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      rate = excluded.rate,
      p1 = excluded.p1,
      p25 = excluded.p25,
      p75 = excluded.p75,
      p99 = excluded.p99,
      target_low = excluded.target_low,
      target_high = excluded.target_high,
      volume_billions = excluded.volume_billions
  `);

  const batch = data.map((row) =>
    stmt.bind(
      row.date,
      row.rate,
      row.p1,
      row.p25,
      row.p75,
      row.p99,
      row.target_low,
      row.target_high,
      row.volume_billions
    )
  );

  await db.batch(batch);
  return data.length;
}

// Upsert policy rates
async function syncPolicyRates(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<number> {
  const data = await fetchPolicyRates(startDate, endDate);

  if (data.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO policy_rates (date, iorb, srf, rrp)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      iorb = excluded.iorb,
      srf = excluded.srf,
      rrp = excluded.rrp
  `);

  const batch = data.map((row) => stmt.bind(row.date, row.iorb, row.srf, row.rrp));

  await db.batch(batch);
  return data.length;
}

// Upsert RRP operations
async function syncRrpOperations(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<number> {
  const data = await fetchRrpOperations(startDate, endDate);

  if (data.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO rrp_operations (date, total_accepted_billions, participating_counterparties, mmf_accepted_billions, gse_accepted_billions)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_accepted_billions = excluded.total_accepted_billions,
      participating_counterparties = excluded.participating_counterparties,
      mmf_accepted_billions = excluded.mmf_accepted_billions,
      gse_accepted_billions = excluded.gse_accepted_billions
  `);

  const batch = data.map((row) =>
    stmt.bind(
      row.date,
      row.total_accepted_billions,
      row.participating_counterparties,
      row.mmf_accepted_billions,
      row.gse_accepted_billions
    )
  );

  await db.batch(batch);
  return data.length;
}

// Update sync metadata
async function updateSyncMetadata(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `
    INSERT INTO sync_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `
    )
    .bind(key, value)
    .run();
}

export interface SyncResult {
  sofr: number;
  effr: number;
  policy: number;
  rrp: number;
  startDate: string;
  endDate: string;
  duration: number;
}

export async function runSync(env: Env, lookbackDays: number = 7): Promise<SyncResult> {
  const start = performance.now();
  const endDate = formatDate(new Date());
  const startDate = formatDate(daysAgo(lookbackDays));

  console.log(`Starting sync: ${startDate} to ${endDate}`);

  // Run all syncs in parallel
  const [sofr, effr, policy, rrp] = await Promise.all([
    syncSofr(env.DB, startDate, endDate),
    syncEffr(env.DB, startDate, endDate),
    syncPolicyRates(env.DB, startDate, endDate),
    syncRrpOperations(env.DB, startDate, endDate),
  ]);

  // Update metadata
  await updateSyncMetadata(env.DB, 'last_sync', new Date().toISOString());
  await updateSyncMetadata(env.DB, 'last_sync_end_date', endDate);

  const duration = Math.round(performance.now() - start);

  console.log(`Sync complete: SOFR=${sofr}, EFFR=${effr}, Policy=${policy}, RRP=${rrp} (${duration}ms)`);

  return { sofr, effr, policy, rrp, startDate, endDate, duration };
}

// Backfill historical data (one-time operation)
export async function backfill(env: Env, startDate: string, endDate: string): Promise<SyncResult> {
  const start = performance.now();

  console.log(`Starting backfill: ${startDate} to ${endDate}`);

  // Run all syncs in parallel
  const [sofr, effr, policy, rrp] = await Promise.all([
    syncSofr(env.DB, startDate, endDate),
    syncEffr(env.DB, startDate, endDate),
    syncPolicyRates(env.DB, startDate, endDate),
    syncRrpOperations(env.DB, startDate, endDate),
  ]);

  // Update metadata
  await updateSyncMetadata(env.DB, 'backfill_start', startDate);
  await updateSyncMetadata(env.DB, 'backfill_end', endDate);
  await updateSyncMetadata(env.DB, 'backfill_completed', new Date().toISOString());

  const duration = Math.round(performance.now() - start);

  console.log(`Backfill complete: SOFR=${sofr}, EFFR=${effr}, Policy=${policy}, RRP=${rrp} (${duration}ms)`);

  return { sofr, effr, policy, rrp, startDate, endDate, duration };
}
