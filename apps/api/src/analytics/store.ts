import type { AnalyticsEventPayload } from "@2check/contracts";
import type { Pool } from "pg";
import type { AnalyticsClient } from "./client.js";

/**
 * PRD 28 — where product-analytics events are recorded and read back.
 *
 * AC-28.6 — analytics is not a dependency of a scan. Recording is fire-and-forget and a failure
 * here is logged and dropped; nothing about a domain check depends on it.
 */
export interface AnalyticsStore {
  /**
   * PRD 28.3 — `client` is derived on the server from the request's User-Agent and is a closed
   * enumeration; the header itself is never stored. It is a separate argument rather than part
   * of the payload so that it cannot be confused for something the browser sent.
   */
  record(payload: AnalyticsEventPayload, client?: AnalyticsClient): Promise<void>;
  /** The funnel and the traffic behind it, over the last `days` days. */
  report(days: number): Promise<AnalyticsReport>;
  /** PRD 19.9 — analytics has a life of its own; this is what ends it. */
  prune(olderThanDays: number): Promise<number>;
}

export interface AnalyticsReport {
  readonly since: string;
  readonly totals: Readonly<Record<string, number>>;
  readonly sessions: number;
  readonly returningSessions: number;
  readonly byLocale: readonly { readonly locale: string; readonly views: number }[];
  readonly byTool: readonly { readonly tool: string; readonly views: number }[];
  readonly byDay: readonly {
    readonly day: string;
    readonly views: number;
    readonly submitted: number;
    readonly accepted: number;
    readonly results: number;
  }[];
  readonly modes: Readonly<Record<string, number>>;
  readonly outcomes: Readonly<Record<string, number>>;
}

function tally(
  rows: readonly { readonly key: string; readonly count: string }[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.key] = Number(row.count);
  }
  return totals;
}

const SINCE = "now() - ($1 || ' days')::interval";

export function createPostgresAnalyticsStore(pool: Pool): AnalyticsStore {
  return {
    async record(payload, client) {
      await pool.query(
        `insert into analytics_events
           (event, locale, tool, mode, scope, outcome, verdict_code, session_id, is_returning,
            device_kind, browser)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          payload.event,
          payload.locale,
          payload.tool,
          payload.mode ?? null,
          payload.scope ?? null,
          payload.outcome ?? null,
          payload.verdictCode ?? null,
          payload.sessionId ?? null,
          payload.returning ?? false,
          client?.deviceKind ?? null,
          client?.browser ?? null,
        ],
      );
    },

    async report(days) {
      const [totals, locales, tools, daily, modes, outcomes, sessions] = await Promise.all([
        pool.query<{ key: string; count: string }>(
          `select event as key, count(*)::text as count from analytics_events
           where occurred_at > ${SINCE} group by event`,
          [days],
        ),
        pool.query<{ locale: string; views: string }>(
          `select locale, count(*)::text as views from analytics_events
           where occurred_at > ${SINCE} and event = 'scan_form_viewed'
           group by locale order by count(*) desc`,
          [days],
        ),
        pool.query<{ tool: string; views: string }>(
          `select tool, count(*)::text as views from analytics_events
           where occurred_at > ${SINCE} and event = 'scan_form_viewed'
           group by tool order by count(*) desc`,
          [days],
        ),
        pool.query<{
          day: string;
          views: string;
          submitted: string;
          accepted: string;
          results: string;
        }>(
          `select to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') as day,
                  count(*) filter (where event = 'scan_form_viewed')::text as views,
                  count(*) filter (where event = 'scan_submitted')::text as submitted,
                  count(*) filter (where event = 'scan_accepted')::text as accepted,
                  count(*) filter (where event = 'scan_result_viewed')::text as results
             from analytics_events
            where occurred_at > ${SINCE}
            group by 1 order by 1`,
          [days],
        ),
        pool.query<{ key: string; count: string }>(
          `select mode as key, count(*)::text as count from analytics_events
           where occurred_at > ${SINCE} and mode is not null group by mode`,
          [days],
        ),
        pool.query<{ key: string; count: string }>(
          `select outcome as key, count(*)::text as count from analytics_events
           where occurred_at > ${SINCE} and outcome is not null group by outcome`,
          [days],
        ),
        pool.query<{ sessions: string; returning: string }>(
          `select count(distinct session_id)::text as sessions,
                  count(distinct session_id) filter (where is_returning)::text as returning
             from analytics_events
            where occurred_at > ${SINCE} and session_id is not null`,
          [days],
        ),
      ]);

      return {
        since: `${days}d`,
        totals: tally(totals.rows),
        sessions: Number(sessions.rows[0]?.sessions ?? 0),
        returningSessions: Number(sessions.rows[0]?.returning ?? 0),
        byLocale: locales.rows.map((row) => ({ locale: row.locale, views: Number(row.views) })),
        byTool: tools.rows.map((row) => ({ tool: row.tool, views: Number(row.views) })),
        byDay: daily.rows.map((row) => ({
          day: row.day,
          views: Number(row.views),
          submitted: Number(row.submitted),
          accepted: Number(row.accepted),
          results: Number(row.results),
        })),
        modes: tally(modes.rows),
        outcomes: tally(outcomes.rows),
      };
    },

    async prune(olderThanDays) {
      const result = await pool.query(
        `delete from analytics_events where occurred_at < now() - ($1 || ' days')::interval`,
        [olderThanDays],
      );
      return result.rowCount ?? 0;
    },
  };
}

/** Non-durable store for tests and for running without a database. */
export function createInMemoryAnalyticsStore(): AnalyticsStore & {
  readonly events: AnalyticsEventPayload[];
} {
  const events: AnalyticsEventPayload[] = [];
  return {
    events,
    async record(payload) {
      events.push(payload);
    },
    async report(days) {
      const totals: Record<string, number> = {};
      for (const event of events) {
        totals[event.event] = (totals[event.event] ?? 0) + 1;
      }
      const sessions = new Set(
        events.map((event) => event.sessionId).filter((id): id is string => id !== undefined),
      );
      return {
        since: `${days}d`,
        totals,
        sessions: sessions.size,
        returningSessions: new Set(
          events.filter((event) => event.returning === true).map((event) => event.sessionId),
        ).size,
        byLocale: [],
        byTool: [],
        byDay: [],
        modes: {},
        outcomes: {},
      };
    },
    async prune() {
      const removed = events.length;
      events.length = 0;
      return removed;
    },
  };
}
