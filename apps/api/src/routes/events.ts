import type { AnalyticsEventPayload } from "@2check/contracts";
import {
  ANALYTICS_EVENTS,
  ANALYTICS_LOCALES,
  ANALYTICS_OUTCOMES,
  ANALYTICS_SCOPES,
  ANALYTICS_TOOLS,
  VERDICT_CODES,
  WEB_API_BASE_PATH,
} from "@2check/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { classifyClient } from "../analytics/client.js";
import type { AnalyticsStore } from "../analytics/store.js";
import type { Metrics } from "../observability/metrics.js";

/**
 * PRD 28.4 and AC-28.3 — the schema is the privacy boundary, and it is strict.
 *
 * Every field is a bounded enumeration. There is no field for a domain, a scanId, the string the
 * reader typed, registration data, an IP address, a fingerprint or a DNS value, and `.strict()`
 * means a payload that carries one is rejected outright rather than quietly trimmed — a rejected
 * event is a bug someone will notice, a trimmed one is a leak nobody will.
 */
const eventSchema = z
  .object({
    event: z.enum(ANALYTICS_EVENTS),
    locale: z.enum(ANALYTICS_LOCALES),
    tool: z.enum(ANALYTICS_TOOLS),
    mode: z.enum(["FULL", "PARTIAL"]).optional(),
    scope: z.enum(ANALYTICS_SCOPES).optional(),
    outcome: z.enum(ANALYTICS_OUTCOMES).optional(),
    verdictCode: z.enum(VERDICT_CODES).optional(),
    // PRD 28.6 — an opaque per-session value generated in the browser, never an account.
    sessionId: z.string().uuid().optional(),
    returning: z.boolean().optional(),
  })
  .strict();

/** A ceiling per request, so a page cannot post an unbounded batch. */
const batchSchema = z.array(eventSchema).min(1).max(20);

export interface EventRouteDependencies {
  readonly analytics?: AnalyticsStore;
  readonly metrics?: Metrics;
}

export function registerEventRoutes(app: FastifyInstance, deps: EventRouteDependencies): void {
  /**
   * PRD 28 — the collection endpoint. It answers 204 and nothing else: there is no read side
   * here, and nothing a caller can learn from it.
   *
   * AC-28.6 — analytics is not a dependency of a scan. Storing is deliberately not awaited by the
   * response, and a storage failure is logged rather than surfaced; a reader's domain check must
   * not fail because a counter did.
   */
  app.post(`${WEB_API_BASE_PATH}/events`, async (request, reply) => {
    const parsed = batchSchema.safeParse(request.body);
    if (!parsed.success) {
      // 204 even on a malformed batch: a beacon has nobody to report an error to, and answering
      // differently would tell a caller which shapes the service accepts.
      request.log.debug({ issues: parsed.error.issues.length }, "rejected an analytics batch");
      return reply.code(204).send();
    }

    const store = deps.analytics;
    if (store !== undefined) {
      /**
       * PRD 28.3 — read here, stored as a coarse class, never kept as a string. The header is
       * already on the request; classifying it is the only thing done with it.
       */
      const client = classifyClient(request.headers["user-agent"]);
      for (const event of parsed.data) {
        // Absent stays absent rather than becoming an explicit undefined column value.
        const payload: AnalyticsEventPayload = {
          event: event.event,
          locale: event.locale,
          tool: event.tool,
          ...(event.mode === undefined ? {} : { mode: event.mode }),
          ...(event.scope === undefined ? {} : { scope: event.scope }),
          ...(event.outcome === undefined ? {} : { outcome: event.outcome }),
          ...(event.verdictCode === undefined ? {} : { verdictCode: event.verdictCode }),
          ...(event.sessionId === undefined ? {} : { sessionId: event.sessionId }),
          ...(event.returning === undefined ? {} : { returning: event.returning }),
        };
        store.record(payload, client).catch((error: unknown) => {
          request.log.warn({ error: String(error) }, "analytics event not recorded");
        });
        deps.metrics?.increment("analytics_event_total");
      }
    }
    return reply.code(204).send();
  });
}

/** Exported for the tests that police the boundary. */
export const analyticsEventSchema = eventSchema;
