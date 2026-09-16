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
  /**
   * Which of the four entry points the scans were started from: the full check, or one of the
   * single-category tools. Taken from the scan records rather than from analytics, because a
   * scan is a durable fact and an analytics event is a best-effort beacon.
   */
  readonly tools: Readonly<Record<string, number>>;
  /** Median seconds from accepted to completed, over the last 30 days. */
  readonly typicalSeconds: number | null;
  readonly audience: {
    readonly sessions: number;
    readonly returningSessions: number;
    readonly views: number;
    /** Sessions by coarse client class; the User-Agent behind them is never stored. */
    readonly devices: readonly { readonly key: string; readonly sessions: number }[];
    readonly browsers: readonly { readonly key: string; readonly sessions: number }[];
  };
}

export interface PublicStatsSource {
  read(): Promise<PublicStats>;
}

const EMPTY: PublicStats = {
  generatedAt: new Date(0).toISOString(),
  scans: { total: 0, completed: 0, last30Days: 0, last24Hours: 0 },
  verdicts: {},
  tools: {},
  typicalSeconds: null,
  audience: { sessions: 0, returningSessions: 0, views: 0, devices: [], browsers: [] },
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
      const [scans, verdicts, tools, duration, clients, report] = await Promise.all([
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
        /**
         * A FULL scan came from the home page; a PARTIAL scan of exactly one category came from
         * that category's tool page. Anything else is a hand-picked selection and is counted
         * apart rather than attributed to a page nobody used.
         */
        pool.query<{ key: string | null; count: string }>(
          `select case
                    when mode = 'FULL' then 'home'
                    when array_length(visible_categories, 1) = 1 then visible_categories[1]
                    else 'custom'
                  end as key,
                  count(*)::text as count
             from scans
            group by 1`,
        ),
        // The median rather than the mean: one scan that sat on a resolver timeout should not
        // decide the number a reader is shown.
        pool.query<{ seconds: string | null }>(
          `select percentile_cont(0.5) within group (
                    order by extract(epoch from (completed_at - started_at))
                  )::text as seconds
             from scans
            where execution_state = 'COMPLETED'
              and completed_at is not null
              and started_at > now() - interval '30 days'`,
        ),
        // Sessions, not events: the question is how many people came with what, not how many
        // times each of them clicked.
        pool.query<{ device_kind: string | null; browser: string | null; sessions: string }>(
          `select device_kind, browser, count(distinct session_id)::text as sessions
             from analytics_events
            where occurred_at > now() - interval '30 days'
              and session_id is not null
            group by 1, 2`,
        ),
        // AC-28.6 — the audience half is a nicety; losing it must not lose the scan counts.
        analytics?.report(30).catch(() => undefined),
      ]);

      const row = scans.rows[0];
      const seconds = duration.rows[0]?.seconds;

      const tallyRows = (
        column: "device_kind" | "browser",
      ): readonly { key: string; sessions: number }[] => {
        const totals = new Map<string, number>();
        for (const entry of clients.rows) {
          const key = (column === "device_kind" ? entry.device_kind : entry.browser) ?? "other";
          totals.set(key, (totals.get(key) ?? 0) + Number(entry.sessions));
        }
        return [...totals.entries()]
          .map(([key, sessions]) => ({ key, sessions }))
          .sort((left, right) => right.sessions - left.sessions);
      };

      return {
        generatedAt: new Date().toISOString(),
        scans: {
          total: Number(row?.total ?? 0),
          completed: Number(row?.completed ?? 0),
          last30Days: Number(row?.recent ?? 0),
          last24Hours: Number(row?.today ?? 0),
        },
        verdicts: tally(verdicts.rows),
        tools: tally(tools.rows),
        typicalSeconds:
          seconds === null || seconds === undefined ? null : Math.round(Number(seconds)),
        audience: {
          sessions: report?.sessions ?? 0,
          returningSessions: report?.returningSessions ?? 0,
          views: report?.totals.scan_form_viewed ?? 0,
          devices: tallyRows("device_kind"),
          browsers: tallyRows("browser"),
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
