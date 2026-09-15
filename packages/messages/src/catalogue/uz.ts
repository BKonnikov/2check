import type { Catalogue } from "../types.js";

/**
 * PRD 13.6 and AC-13.7 — Uzbek is a mandatory language, and a missing translation must block a
 * production configuration rather than be papered over.
 *
 * This catalogue is deliberately empty. Machine-translated product copy for the Uzbek market
 * would read as machine-translated and cost the service its credibility, so the entries are left
 * to a native speaker. Until they are written, assertCatalogueComplete reports Uzbek as
 * incomplete and the production readiness check fails — which is the specified behaviour, not an
 * oversight.
 */
export const uz: Catalogue = {};
