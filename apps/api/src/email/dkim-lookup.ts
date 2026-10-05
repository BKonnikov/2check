import { DKIM_MAX_SELECTORS_PER_SCAN, type DkimLookup } from "@2check/domain";
import { createTxtLookup } from "./txt-lookup.js";

export interface DkimLookupPort {
  readonly provider: string;
  readonly lookup: DkimLookup;
}

/** 1.1 §5.2 — one name per selector, and the selector list is already bounded at eight. */
export const DKIM_MAX_LOOKUPS_PER_SCAN = DKIM_MAX_SELECTORS_PER_SCAN;

export function createDkimLookup(): DkimLookupPort {
  return createTxtLookup(DKIM_MAX_LOOKUPS_PER_SCAN);
}
