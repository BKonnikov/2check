import type { FastifyInstance } from "fastify";
import type { Env } from "../config/env.js";

/**
 * PRD 27.5 — a new instance confirms its dependencies before it receives traffic.
 * Concrete probes (configuration, security policy, trust store, scan store) plug in here.
 */
export interface ReadinessProbe {
  readonly name: string;
  check(): Promise<void>;
}

interface ProbeResult {
  readonly name: string;
  readonly ready: boolean;
  readonly error?: string;
}

export function registerHealthRoutes(
  app: FastifyInstance,
  env: Env,
  probes: readonly ReadinessProbe[],
): void {
  app.get("/healthz", async () => ({
    status: "ok",
    release: env.APPLICATION_RELEASE_VERSION,
  }));

  app.get("/readyz", async (_request, reply) => {
    const checks: ProbeResult[] = await Promise.all(
      probes.map(async (probe): Promise<ProbeResult> => {
        try {
          await probe.check();
          return { name: probe.name, ready: true };
        } catch (error) {
          return {
            name: probe.name,
            ready: false,
            error: error instanceof Error ? error.message : "unknown failure",
          };
        }
      }),
    );

    const ready = checks.every((check) => check.ready);
    return reply.code(ready ? 200 : 503).send({
      ready,
      release: env.APPLICATION_RELEASE_VERSION,
      checks,
    });
  });
}
