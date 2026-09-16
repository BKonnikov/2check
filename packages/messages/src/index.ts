import type { MessageDescriptor } from "@2check/contracts";
import { en } from "./catalogue/en.js";
import { ru } from "./catalogue/ru.js";
import { uz } from "./catalogue/uz.js";
import { type Catalogue, FALLBACK_LANGUAGE, LANGUAGES, type Language } from "./types.js";

export * from "./types.js";

export const CATALOGUES: Readonly<Record<Language, Catalogue>> = { ru, uz, en };

/** The reference catalogue: every other language must cover exactly these codes. */
export const REFERENCE_LANGUAGE: Language = "en";

export interface ResolvedMessage {
  readonly title: string;
  /** One short line of measured particulars; see MessageEntry.fact. */
  readonly fact?: string;
  readonly explanation?: string;
  readonly impact?: string;
  readonly recommendation?: string;
  /** The language the text actually came from, which may differ from the one requested. */
  readonly language: Language | "none";
  readonly titleCode: string;
}

/**
 * PRD 13.8 and AC-13.8 — parameters are substituted as plain text. Values are stringified and
 * any angle bracket or ampersand is escaped, so a message can never carry pre-built markup.
 */
function escapeMarkup(value: string | number | boolean): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const DATE_LOCALE: Readonly<Record<Language, string>> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-GB",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * PRD 13.6 — a date inside a message is written the way the reader's language writes dates.
 * A registry timestamp is a calendar fact rather than an instant, so it is rendered in UTC:
 * the same string then comes out of the server and out of the browser, whatever zone either
 * of them is in.
 */
function localizeDate(value: string, language: Language): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(DATE_LOCALE[language], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function interpolate(
  template: string,
  params: Readonly<Record<string, string | number | boolean>> | undefined,
  language: Language,
): string {
  if (params === undefined) {
    return template;
  }
  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      return match;
    }
    if (typeof value === "string" && ISO_DATE.test(value)) {
      return escapeMarkup(localizeDate(value, language));
    }
    return escapeMarkup(value);
  });
}

/**
 * PRD 13.6 — runtime fallback: the requested language, then EN, then a safe generic message.
 * The safe message never claims anything about the domain; it says only that the wording is
 * missing, and the code itself is exposed for the technical view alone.
 */
export function resolveMessage(descriptor: MessageDescriptor, language: Language): ResolvedMessage {
  for (const candidate of [language, FALLBACK_LANGUAGE] as const) {
    const entry = CATALOGUES[candidate][descriptor.titleCode];
    if (entry !== undefined) {
      return {
        title: interpolate(entry.title, descriptor.params, candidate),
        ...(entry.fact === undefined
          ? {}
          : { fact: interpolate(entry.fact, descriptor.params, candidate) }),
        ...(entry.explanation === undefined
          ? {}
          : { explanation: interpolate(entry.explanation, descriptor.params, candidate) }),
        ...(entry.impact === undefined
          ? {}
          : { impact: interpolate(entry.impact, descriptor.params, candidate) }),
        ...(entry.recommendation === undefined
          ? {}
          : { recommendation: interpolate(entry.recommendation, descriptor.params, candidate) }),
        language: candidate,
        titleCode: descriptor.titleCode,
      };
    }
  }

  return { title: "", language: "none", titleCode: descriptor.titleCode };
}

export interface CatalogueGap {
  readonly language: Language;
  readonly missing: readonly string[];
}

/**
 * PRD 13.6 — completeness and review are different things.
 *
 * A complete catalogue unblocks a production configuration; whether a person who speaks the
 * language has read it is tracked separately, so filling a catalogue never quietly erases the
 * fact that nobody has checked the wording.
 */
export const CATALOGUE_REVIEW: Readonly<Record<Language, { reviewedByNativeSpeaker: boolean }>> = {
  ru: { reviewedByNativeSpeaker: true },
  en: { reviewedByNativeSpeaker: true },
  uz: { reviewedByNativeSpeaker: false },
};

export function unreviewedLanguages(): Language[] {
  return LANGUAGES.filter((language) => !CATALOGUE_REVIEW[language].reviewedByNativeSpeaker);
}

/**
 * PRD 13.6 and AC-13.7 — a missing mandatory translation is a configuration or build error.
 * This is what a production readiness check calls; it does not paper over a gap.
 */
export function findCatalogueGaps(): CatalogueGap[] {
  const reference = Object.keys(CATALOGUES[REFERENCE_LANGUAGE]).sort();
  const gaps: CatalogueGap[] = [];

  for (const language of LANGUAGES) {
    const missing = reference.filter((code) => CATALOGUES[language][code] === undefined);
    if (missing.length > 0) {
      gaps.push({ language, missing });
    }
  }
  return gaps;
}

export function assertCatalogueComplete(): void {
  const gaps = findCatalogueGaps();
  if (gaps.length > 0) {
    const detail = gaps
      .map((gap) => `${gap.language}: ${gap.missing.length} message(s) missing`)
      .join("; ");
    throw new Error(`Mandatory translations are incomplete — ${detail}`);
  }
}
