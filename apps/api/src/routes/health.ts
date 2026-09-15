import type { ExecutionContext } from "@2check/contracts";
import type { FastifyInstance } from "fastify";
import type { Env } from "../config/env.js";
import type { Metrics } from "../observability/metrics.js";

/**
 * PRD 27.5 and 21.6 — probes come in two kinds.
 *
 * A required probe gates traffic: without a valid security policy, trust store or a compatible
 * scan store the instance cannot accept a scan safely. A degrading probe does not: PRD 21.6 and
 * AC-21.5 are explicit that an unavailable Redis or a failing external provider is a degraded
 * state, not an unready instance, because a safe bypass keeps results correct.
 */
export interface ReadinessProbe {
  readonly name: string;
  readonly required?: boolean;
  check(): Promise<void>;
}

interface ProbeResult {
  readonly name: string;
  readonly ready: boolean;
  readonly required: boolean;
  readonly error?: string;
}

export interface ReleaseManifestSource {
  readonly storageSchemaVersion: number;
  readonly executionContext: ExecutionContext;
}

export function registerHealthRoutes(
  app: FastifyInstance,
  env: Env,
  probes: readonly ReadinessProbe[],
  metrics?: Metrics,
  release?: ReleaseManifestSource,
): void {
  app.get("/healthz", async () => ({
    status: "ok",
    release: env.APPLICATION_RELEASE_VERSION,
  }));

  app.get("/readyz", async (_request, reply) => {
    const checks: ProbeResult[] = await Promise.all(
      probes.map(async (probe): Promise<ProbeResult> => {
        const required = probe.required ?? true;
        try {
          await probe.check();
          return { name: probe.name, ready: true, required };
        } catch (error) {
          return {
            name: probe.name,
            ready: false,
            required,
            error: error instanceof Error ? error.message : "unknown failure",
          };
        }
      }),
    );

    const ready = checks.every((check) => check.ready || !check.required);
    const degraded = ready && checks.some((check) => !check.ready);

    return reply.code(ready ? 200 : 503).send({
      ready,
      status: ready ? (degraded ? "DEGRADED" : "READY") : "NOT_READY",
      release: env.APPLICATION_RELEASE_VERSION,
      checks,
    });
  });

  if (release !== undefined) {
    /**
     * PRD 27.2 — the release manifest lets a deployed combination be reconstructed: the
     * application release, the storage schema version, and the scoring, security, orchestration,
     * cache, module and trust anchor versions. It contains no secrets (PRD 20.7).
     */
    app.get("/release", async () => ({
      applicationReleaseVersion: env.APPLICATION_RELEASE_VERSION,
      storageSchemaVersion: release.storageSchemaVersion,
      ...release.executionContext,
    }));
  }

  if (metrics !== undefined) {
    // PRD 21.1 — platform signals only; nothing here describes the health of a scanned domain.
    app.get("/metrics", async (_request, reply) =>
      reply.header("content-type", "text/plain; version=0.0.4").send(metrics.render()),
    );
  }
}
