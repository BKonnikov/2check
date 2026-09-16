import { randomUUID } from "node:crypto";
import type {
  CanonicalDomain,
  CreateScanResponse,
  PublicCanonicalDomain,
  ScanCategory,
  ScanDetailsResponse,
  WebApiError,
  WebScanResponse,
} from "@2check/contracts";
import { WEB_API_BASE_PATH } from "@2check/contracts";
import { canonicalizeDomain } from "@2check/domain";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { Metrics } from "../observability/metrics.js";
import type { AdmissionControl } from "../scan/admission.js";
import { toPublicCategories, toTechnicalDetails } from "../scan/exposure.js";
import {
  buildExecutionContext,
  DEFAULT_SCAN_DEADLINE_MS,
  runScan,
  type ScanDependencies,
} from "../scan/orchestrator.js";
import { isTerminal, type ScanRecord, type ScanStore } from "../scan/store.js";

/** PRD 17.2 and 17.9 — unknown top-level fields are rejected and enums are validated strictly. */
const createScanSchema = z
  .object({
    input: z.string().min(1),
    mode: z.enum(["FULL", "PARTIAL"]),
    selectedCategories: z.array(z.enum(["dns", "registry", "tls"])).optional(),
    cacheMode: z.enum(["NORMAL", "FORCE_REFRESH"]).optional(),
  })
  .strict();

const POLL_AFTER_MS = 400;

/** How long past the scan budget a record may stay non-terminal before a reader is told the truth. */
const STALE_MARGIN_MS = 10_000;

/** Categories this deployment can actually execute. Registry and TLS are not implemented yet. */
const IMPLEMENTED_CATEGORIES: readonly ScanCategory[] = ["dns", "registry", "tls"];

function apiError(
  reply: FastifyReply,
  statusCode: number,
  error: Omit<WebApiError, "message"> & { readonly titleCode: string },
): FastifyReply {
  const { titleCode, ...rest } = error;
  const body: WebApiError = { ...rest, message: { titleCode } };
  return reply.code(statusCode).send(body);
}

/** PRD 17.5 — the public view never carries originalInput. */
function publicDomain(domain: Omit<CanonicalDomain, "originalInput">): PublicCanonicalDomain {
  return {
    unicodeHostname: domain.unicodeHostname,
    asciiHostname: domain.asciiHostname,
    publicSuffix: domain.publicSuffix,
    publicSuffixType: domain.publicSuffixType,
    registrableDomain: domain.registrableDomain,
    isIdn: domain.isIdn,
  };
}

/**
 * PRD 22.2 and AC-16.9 — an accepted scan may not stay RUNNING for ever, and the in-process timer
 * that normally guarantees that is worth nothing if the process died, or if the terminal write
 * itself failed. A record that has outlived the budget by a clear margin is therefore reported
 * as unrecoverable when it is read, whatever the row still says.
 *
 * This is a projection, not a write: if the execution is in fact still alive and lands its
 * snapshot a moment later, the next read returns the real result rather than a failure someone
 * persisted over it.
 */
function outlivedItsBudget(record: ScanRecord, budgetMs: number): boolean {
  if (isTerminal(record.executionState)) {
    return false;
  }
  const started = Date.parse(record.startedAt);
  return Number.isFinite(started) && Date.now() - started > budgetMs + STALE_MARGIN_MS;
}

function asUnrecoverable(record: ScanRecord): ScanRecord {
  return {
    ...record,
    executionState: "FAILED",
    completedAt: new Date().toISOString(),
    failure: {
      failureCode: "execution_state_unrecoverable",
      occurredAt: new Date().toISOString(),
    },
  };
}

function toResponse(record: ScanRecord): WebScanResponse {
  const terminal = record.executionState === "COMPLETED" || record.executionState === "FAILED";
  return {
    scanId: record.scanId,
    executionState: record.executionState,
    mode: record.mode,
    canonicalDomain: publicDomain(record.canonicalDomain),
    selectedCategories: record.visibleCategories,
    // PRD 6.4 — the internal DTO is never serialised directly.
    categories: toPublicCategories(record.categories),
    ...(record.summary === undefined ? {} : { summary: record.summary }),
    startedAt: record.startedAt,
    ...(record.completedAt === undefined ? {} : { completedAt: record.completedAt }),
    ...(record.completionReason === undefined ? {} : { completionReason: record.completionReason }),
    ...(record.failure === undefined ? {} : { failure: record.failure }),
    ...(terminal ? {} : { pollAfterMs: POLL_AFTER_MS }),
  };
}

export interface ScanRouteDependencies extends ScanDependencies {
  readonly store: ScanStore;
  readonly metrics?: Metrics;
  /** PRD 22.2 and AC-25.8 — nothing starts a scan without passing this first. */
  readonly admission?: AdmissionControl;
  /**
   * PRD 27.5 — the instance confirms it can still store a result before it accepts work.
   * Rejecting a scan loudly beats accepting one that can never reach a terminal state.
   */
  readonly canStoreResults?: () => Promise<void>;
}

export function registerScanRoutes(app: FastifyInstance, deps: ScanRouteDependencies): void {
  app.post(`${WEB_API_BASE_PATH}/scans`, async (request, reply) => {
    const parsed = createScanSchema.safeParse(request.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError(reply, 400, {
        errorCode: "request_invalid",
        titleCode: "web.error.request_invalid",
        retryable: false,
        ...(issue === undefined ? {} : { field: issue.path.join(".") || "body" }),
      });
    }

    const { input, mode, selectedCategories, cacheMode = "NORMAL" } = parsed.data;

    // PRD 17.2 — FULL carries no selectedCategories; PARTIAL carries a non-empty proper subset.
    if (mode === "FULL" && selectedCategories !== undefined) {
      return apiError(reply, 400, {
        errorCode: "scan_scope_invalid",
        titleCode: "web.error.scan_scope_invalid",
        field: "selectedCategories",
        retryable: false,
      });
    }
    if (mode === "PARTIAL") {
      if (selectedCategories === undefined || selectedCategories.length === 0) {
        return apiError(reply, 400, {
          errorCode: "scan_scope_invalid",
          titleCode: "web.error.scan_scope_invalid",
          field: "selectedCategories",
          retryable: false,
        });
      }
      if (new Set(selectedCategories).size === 3) {
        // PRD 17.2 — all three categories must be sent as FULL; no implicit conversion.
        return apiError(reply, 422, {
          errorCode: "scan_scope_invalid",
          titleCode: "web.error.scan_scope_invalid",
          field: "selectedCategories",
          retryable: false,
        });
      }
    }

    /**
     * PRD 22.2 and AC-25.8 — the caller's rate and the service's capacity are checked before a
     * scanId exists, so a refused request leaves nothing behind. A malformed request is answered
     * first: it costs nothing and should not consume the caller's allowance.
     */
    if (deps.canStoreResults !== undefined) {
      try {
        await deps.canStoreResults();
      } catch (error) {
        request.log.error({ error: String(error) }, "refusing scans: results cannot be stored");
        deps.metrics?.increment("scan_rejected_total");
        return apiError(reply, 503, {
          errorCode: "service_unavailable",
          titleCode: "web.error.service_unavailable",
          retryable: true,
          retryAfterSeconds: 60,
        });
      }
    }

    const ticket = deps.admission?.admit(request.ip) ?? { ok: true as const, release() {} };
    if (!ticket.ok) {
      deps.metrics?.increment("scan_rejected_total");
      return apiError(reply, ticket.reason === "rate_limited" ? 429 : 503, {
        errorCode: ticket.reason,
        titleCode: `web.error.${ticket.reason}`,
        retryable: true,
        retryAfterSeconds: ticket.retryAfterSeconds,
      });
    }

    // PRD 16.2 and AC-16.1 — preprocessing runs before a scan exists; invalid input creates no scanId.
    const canonical = canonicalizeDomain(input);
    if (!canonical.ok) {
      ticket.release();
      return apiError(reply, 400, {
        errorCode: canonical.code,
        titleCode: `web.error.${canonical.code}`,
        field: "input",
        retryable: false,
      });
    }

    const requested: readonly ScanCategory[] =
      mode === "FULL" ? ["dns", "registry", "tls"] : [...new Set(selectedCategories ?? [])];
    const unavailable = requested.filter((category) => !IMPLEMENTED_CATEGORIES.includes(category));
    if (unavailable.length > 0) {
      // PRD 17.7 — 503 when a scan cannot be accepted safely, rather than silently narrowing it.
      return apiError(reply, 503, {
        errorCode: "scan_scope_not_available",
        titleCode: "web.error.scan_scope_not_available",
        field: "selectedCategories",
        retryable: true,
      });
    }

    // PRD 19.6 — originalInput is dropped here and never reaches the store.
    const { originalInput: _originalInput, ...storedDomain } = canonical.domain;

    const record: ScanRecord = {
      scanId: randomUUID(),
      mode,
      cacheMode,
      visibleCategories: requested,
      canonicalDomain: storedDomain,
      executionContext: buildExecutionContext(deps.internalInfrastructureDenylist),
      startedAt: new Date().toISOString(),
      executionState: "PENDING",
      categories: [],
    };
    await deps.store.create(record);
    deps.metrics?.increment("scan_started_total");
    if (cacheMode === "FORCE_REFRESH") {
      deps.metrics?.increment("force_refresh_total");
    }

    // PRD 17.3 — POST acknowledges acceptance; it never terminalizes, even on a full cache hit.
    void runScan(record, deps.store, deps)
      .catch((error: unknown) => {
        // PRD 21.3 — a background failure that nobody logs is a failure nobody can diagnose.
        app.log.error({ error: String(error), scanId: record.scanId }, "scan execution failed");
      })
      .finally(() => {
        ticket.release();
      });

    const body: CreateScanResponse = {
      scanId: record.scanId,
      executionState: "PENDING",
      pollAfterMs: POLL_AFTER_MS,
    };
    return reply.code(202).send(body);
  });

  app.get<{ Params: { scanId: string } }>(
    `${WEB_API_BASE_PATH}/scans/:scanId`,
    async (request, reply) => {
      const record = await deps.store.get(request.params.scanId);
      if (record === undefined) {
        return apiError(reply, 404, {
          errorCode: "scan_not_found",
          titleCode: "web.error.scan_not_found",
          retryable: false,
        });
      }
      // PRD 17.7 and AC-17.4 — HTTP status never encodes domain health.
      // PRD 21.1 and AC-21.7 — a domain FAIL is a product result, never a platform error.
      if (record.executionState === "COMPLETED") {
        deps.metrics?.increment("scan_completed_total");
      }
      if (record.executionState === "FAILED") {
        deps.metrics?.increment("scan_failed_total");
      }
      if (outlivedItsBudget(record, deps.scanDeadlineMs ?? DEFAULT_SCAN_DEADLINE_MS)) {
        request.log.error(
          { scanId: record.scanId, startedAt: record.startedAt },
          "scan outlived its budget without reaching a terminal state",
        );
        deps.metrics?.increment("scan_failed_total");
        return reply.code(200).send(toResponse(asUnrecoverable(record)));
      }
      return reply.code(200).send(toResponse(record));
    },
  );

  /**
   * PRD 17.1, 6.4 and 23.6 — the Technical exposure level.
   *
   * It carries the same checks the public response already named, with the measurements behind
   * them: what each resolver answered, the certificate facts, the registration record. Every
   * field is taken from an explicit permitted list (see exposure.ts); registrant values are not
   * on it, and there is no raw RDAP or WHOIS body here (AC-17.8).
   */
  app.get<{ Params: { scanId: string } }>(
    `${WEB_API_BASE_PATH}/scans/:scanId/details`,
    async (request, reply) => {
      const record = await deps.store.get(request.params.scanId);
      if (record === undefined) {
        return apiError(reply, 404, {
          errorCode: "scan_not_found",
          titleCode: "web.error.scan_not_found",
          retryable: false,
        });
      }
      const body: ScanDetailsResponse = {
        scanId: record.scanId,
        generatedAt: new Date().toISOString(),
        checks: toTechnicalDetails(record.categories),
      };
      return reply.code(200).send(body);
    },
  );

  /**
   * PRD 17.1 and 25.3 — the gated registrant resource.
   *
   * AC-25.2 — knowing a scanId is deliberately not enough. The MVP defines no server-side
   * clearance condition, so there is nothing that can satisfy the gate and the endpoint refuses
   * every request. Returning 403 with no body of registrant data is the specified behaviour:
   * without a trustworthy clearance condition, personal data is not returned at all.
   */
  app.get<{ Params: { scanId: string } }>(
    `${WEB_API_BASE_PATH}/scans/:scanId/registry/registrant`,
    async (_request, reply) =>
      apiError(reply, 403, {
        errorCode: "gated_access_denied",
        titleCode: "web.error.gated_access_denied",
        retryable: false,
      }),
  );
}
