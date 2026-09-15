/** PRD 13.6 — the mandatory languages. */
export const LANGUAGES = ["ru", "uz", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/** PRD 13.6 — EN is the runtime fallback before the safe generic message. */
export const FALLBACK_LANGUAGE: Language = "en";

export interface MessageEntry {
  readonly title: string;
  readonly explanation?: string;
  readonly impact?: string;
  readonly recommendation?: string;
}

export type Catalogue = Readonly<Record<string, MessageEntry>>;
