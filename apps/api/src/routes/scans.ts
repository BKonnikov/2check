import { randomUUID } from "node:crypto";
import type {
  CanonicalDomain,
  CreateScanResponse,
  PublicCanonicalDomain,
  ScanCategory,
  WebApiError,
  WebScanResponse,
} from "@2check/contracts";
import { WEB_API_BASE_PATH } from "@2check/contracts";
import { canonicalizeDomain } from "@2check/domain";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { buildExecutionContext, runScan, type ScanDependencies } from "../scan/orchestrator.js";
import type { ScanRecord, ScanStore } from "../scan/store.js";

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

/** Categories this deployment can actually execute. Registry and TLS are not implemented yet. */
const IMPLEMENTED_CATEGORIES: readonly ScanCategory[] = ["dns", "registry"];

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

function toResponse(record: ScanRecord): WebScanResponse {
  const terminal = record.executionState === "COMPLETED" || record.executionState === "FAILED";
  return {
    scanId: record.scanId,
    executionState: record.executionState,
    mode: record.mode,
    canonicalDomain: publicDomain(record.canonicalDomain),
    selectedCategories: record.visibleCategories,
    categories: record.categories,
    startedAt: record.startedAt,
    ...(record.completedAt === undefined ? {} : { completedAt: record.completedAt }),
    ...(record.failure === undefined ? {} : { failure: record.failure }),
    ...(terminal ? {} : { pollAfterMs: POLL_AFTER_MS }),
  };
}

export interface ScanRouteDependencies extends ScanDependencies {
  readonly store: ScanStore;
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

    const { input, mode, selectedCategories } = parsed.data;

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

    // PRD 16.2 and AC-16.1 — preprocessing runs before a scan exists; invalid input creates no scanId.
    const canonical = canonicalizeDomain(input);
    if (!canonical.ok) {
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
      visibleCategories: requested,
      canonicalDomain: storedDomain,
      executionContext: buildExecutionContext(),
      startedAt: new Date().toISOString(),
      executionState: "PENDING",
      categories: [],
    };
    await deps.store.create(record);

    // PRD 17.3 — POST acknowledges acceptance; it never terminalizes, even on a full cache hit.
    void runScan(record, deps.store, deps).catch(() => undefined);

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
      return reply.code(200).send(toResponse(record));
    },
  );
}
