import { WEB_API_BASE_PATH } from "@2check/contracts";
import type { FastifyInstance } from "fastify";
import type { PublicStatsSource } from "../analytics/public-stats.js";

export interface StatsRouteDependencies {
  readonly stats?: PublicStatsSource;
}

/**
 * PRD 28 — the published counters.
 *
 * This is the one read side of analytics that faces the public, and it answers with aggregates
 * only. It is cacheable on purpose: the numbers are the same for everyone, so a shared cache is
 * appropriate here in a way it never is for a scan result (PRD 25.4).
 */
export function registerStatsRoutes(app: FastifyInstance, deps: StatsRouteDependencies): void {
  app.get(`${WEB_API_BASE_PATH}/stats`, async (request, reply) => {
    const source = deps.stats;
    if (source === undefined) {
      return reply.code(503).send({ error: { code: "stats_unavailable" } });
    }
    try {
      const stats = await source.read();
      reply.header("cache-control", "public, max-age=300");
      return reply.send(stats);
    } catch (error) {
      request.log.warn({ error: String(error) }, "public statistics could not be read");
      return reply.code(503).send({ error: { code: "stats_unavailable" } });
    }
  });
}
