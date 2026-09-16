import type { Pool } from "pg";
import type { AnalyticsStore } from "./store.js";

/**
 * PRD 28 — the part of the product's own usage that is published.
 *
 * Everything here is a count. It carries no domain, no scanId, no address and nothing that could
 * be traced to one reader or to one of the domains somebody checked: what was looked at is the
 * reader's business, how much the service is used is the service's. That boundary is why this is
 * a separate module with its own queries rather than a projection of the operator's report.
 */
export interface PublicStats {
  readonly generatedAt: string;
  readonly scans: {
    readonly total: number;
    readonly completed: number;
    readonly last30Days: number;
    readonly last24Hours: number;
  };
  /** Completed FULL scans by verdict, which is the only place a domain outcome is counted. */
  readonly verdicts: Readonly<Record<string, number>>;
  readonly modes: Readonly<Record<string, number>>;
  readonly byDay: readonly { readonly day: string; readonly scans: number }[];
  readonly audience: {
    readonly sessions: number;
    readonly returningSessions: number;
    readonly views: number;
    readonly locales: readonly { readonly locale: string; readonly views: number }[];
  };
}

export interface PublicStatsSource {
  read(): Promise<PublicStats>;
}

const EMPTY: PublicStats = {
  generatedAt: new Date(0).toISOString(),
  scans: { total: 0, completed: 0, last30Days: 0, last24Hours: 0 },
  verdicts: {},
  modes: {},
  byDay: [],
  audience: { sessions: 0, returningSessions: 0, views: 0, locales: [] },
};

function tally(rows: readonly { key: string | null; count: string }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.key !== null) {
      totals[row.key] = Number(row.count);
    }
  }
  return totals;
}

export function createPostgresPublicStats(
  pool: Pool,
  analytics?: AnalyticsStore,
): PublicStatsSource {
  return {
    async read() {
      const [scans, verdicts, modes, daily, report] = await Promise.all([
        pool.query<{
          total: string;
          completed: string;
          recent: string;
          today: string;
        }>(
          `select count(*)::text as total,
                  count(*) filter (where execution_state = 'COMPLETED')::text as completed,
                  count(*) filter (where started_at > now() - interval '30 days')::text as recent,
                  count(*) filter (where started_at > now() - interval '24 hours')::text as today
             from scans`,
        ),
        pool.query<{ key: string | null; count: string }>(
          `select summary->>'verdictCode' as key, count(*)::text as count
             from scans
            where execution_state = 'COMPLETED' and mode = 'FULL'
              and summary->>'verdictCode' is not null
            group by 1`,
        ),
        pool.query<{ key: string | null; count: string }>(
          `select mode as key, count(*)::text as count from scans group by mode`,
        ),
        pool.query<{ day: string; scans: string }>(
          `select to_char(date_trunc('day', started_at), 'YYYY-MM-DD') as day,
                  count(*)::text as scans
             from scans
            where started_at > now() - interval '30 days'
            group by 1 order by 1`,
        ),
        // AC-28.6 — the audience half is a nicety; losing it must not lose the scan counts.
        analytics?.report(30).catch(() => undefined),
      ]);

      const row = scans.rows[0];
      return {
        generatedAt: new Date().toISOString(),
        scans: {
          total: Number(row?.total ?? 0),
          completed: Number(row?.completed ?? 0),
          last30Days: Number(row?.recent ?? 0),
          last24Hours: Number(row?.today ?? 0),
        },
        verdicts: tally(verdicts.rows),
        modes: tally(modes.rows),
        byDay: daily.rows.map((entry) => ({ day: entry.day, scans: Number(entry.scans) })),
        audience: {
          sessions: report?.sessions ?? 0,
          returningSessions: report?.returningSessions ?? 0,
          views: report?.totals.scan_form_viewed ?? 0,
          locales: report?.byLocale ?? [],
        },
      };
    },
  };
}

/** For tests and for running without a database: honest zeroes rather than invented numbers. */
export function createEmptyPublicStats(): PublicStatsSource {
  return {
    async read() {
      return { ...EMPTY, generatedAt: new Date().toISOString() };
    },
  };
}

/**
 * The page behind this is public, so the query behind it must not be. One aggregate every few
 * minutes is plenty for a counter nobody watches tick, and it means a crawler cannot turn the
 * statistics page into a sequential scan of the scans table.
 */
export function cachePublicStats(source: PublicStatsSource, ttlMs: number): PublicStatsSource {
  let held: { at: number; value: PublicStats } | undefined;
  let inFlight: Promise<PublicStats> | undefined;

  return {
    async read() {
      const now = Date.now();
      if (held !== undefined && now - held.at < ttlMs) {
        return held.value;
      }
      inFlight ??= source
        .read()
        .then((value) => {
          held = { at: Date.now(), value };
          return value;
        })
        .finally(() => {
          inFlight = undefined;
        });
      try {
        return await inFlight;
      } catch (error) {
        // A failed refresh serves the last good answer rather than an error page.
        if (held !== undefined) {
          return held.value;
        }
        throw error;
      }
    },
  };
}
