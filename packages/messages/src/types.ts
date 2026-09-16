/** PRD 13.6 — the mandatory languages. */
export const LANGUAGES = ["ru", "uz", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/** PRD 13.6 — EN is the runtime fallback before the safe generic message. */
export const FALLBACK_LANGUAGE: Language = "en";

export interface MessageEntry {
  readonly title: string;
  /**
   * PRD 13.2 — the measured particulars of this check, in one short line.
   *
   * Distinct from `explanation`, which teaches the reader what the check is: a fact says what
   * was found about this domain and nothing else, so it can be carried by compact surfaces —
   * the shared image above all — where a paragraph will not fit. Only messages with a
   * particular worth stating carry one.
   */
  readonly fact?: string;
  readonly explanation?: string;
  readonly impact?: string;
  readonly recommendation?: string;
}

export type Catalogue = Readonly<Record<string, MessageEntry>>;
