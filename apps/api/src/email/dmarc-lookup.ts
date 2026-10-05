import { DMARC_QUERY_LIMIT, type DmarcLookup } from "@2check/domain";
import { createTxtLookup } from "./txt-lookup.js";

export interface DmarcLookupPort {
  readonly provider: string;
  readonly lookup: DmarcLookup;
}

/**
 * 1.1 §4.3 — RFC 9989 bounds the walk itself at eight queries, so the per-scan budget is the same
 * number. It is a second lock on the same door: the walk counts what it asks for, and the port
 * refuses anything past the count even if a future caller forgets to.
 */
export const DMARC_MAX_LOOKUPS_PER_SCAN = DMARC_QUERY_LIMIT;

export function createDmarcLookup(): DmarcLookupPort {
  return createTxtLookup(DMARC_MAX_LOOKUPS_PER_SCAN);
}
