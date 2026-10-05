import type { SpfLookup } from "@2check/domain";
import { createTxtLookup } from "./txt-lookup.js";

export interface SpfLookupPort {
  readonly provider: string;
  readonly lookup: SpfLookup;
}

/** 1.1 §3.4 — a record may name far more than the ten terms RFC 7208 lets a receiver evaluate. */
export const SPF_MAX_LOOKUPS_PER_SCAN = 24;

export function createSpfLookup(): SpfLookupPort {
  return createTxtLookup(SPF_MAX_LOOKUPS_PER_SCAN);
}
