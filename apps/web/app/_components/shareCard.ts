import type { Language } from "@2check/messages";
import { resolveMessage } from "@2check/messages";
import type { Ui } from "./chrome";

/**
 * PRD 23.9 — the share card.
 *
 * The card is built from the scan result the browser already holds; nothing is requested from the
 * server to make one, and nothing about it is recorded. What it may carry is the safe public
 * representation and nothing else: no technical detail, no personal data, no scanId, no URL and
 * not the string the reader typed. Deciding that is this module's job, and it is a pure function
 * so the rule can be tested rather than trusted.
 */

export interface ShareCardModel {
  readonly domain: string;
  /** AC-23.3 — a PARTIAL scan states neither an overall verdict nor an overall score. */
  readonly verdict?: string;
  readonly score?: number;
  readonly tone: "pass" | "warn" | "fail" | "neutral";
  readonly confidence: string;
  /**
   * Each category says how much of it actually passed. A card that only says "fine" asks the
   * reader to take it on faith; a card that says "8 of 9 checks passed" says what was looked at.
   */
  readonly categories: readonly {
    readonly name: string;
    readonly status: string;
    readonly passed: number;
    readonly total: number;
    readonly tone: "pass" | "warn" | "fail" | "neutral";
  }[];
  readonly issues: readonly { readonly title: string; readonly severity: string }[];
  readonly footer: string;
  /** The word after the ratio, e.g. "проверок пройдено". */
  readonly checksLabel: string;
  /** PRD 23.7 — a result is only true of a moment, so the card carries the moment. */
  readonly checkedAt?: string;
}

interface ScanLike {
  readonly mode: string;
  readonly completedAt?: string;
  readonly canonicalDomain: { readonly unicodeHostname: string };
  readonly categories: readonly {
    readonly category: string;
    readonly status: string;
    readonly checks?: readonly {
      readonly status?: string;
      readonly freshness?: { readonly checkedAt?: string };
    }[];
  }[];
  readonly summary?: {
    readonly state: string;
    readonly verdictCode?: string;
    readonly score?: number;
    readonly confidence: { readonly level: string };
    readonly issues: readonly {
      readonly severity: string;
      readonly message: { readonly titleCode: string; readonly params?: Record<string, unknown> };
    }[];
  };
}

const VERDICT_TONE: Readonly<Record<string, ShareCardModel["tone"]>> = {
  HEALTHY: "pass",
  RECOMMENDATIONS: "warn",
  NO_CONFIRMED_ISSUES_INCOMPLETE: "warn",
  PROBLEMS: "fail",
  CRITICAL_PROBLEM: "fail",
};

const STATUS_TONE: Readonly<Record<string, ShareCardModel["tone"]>> = {
  PASS: "pass",
  FAIL: "fail",
  UNKNOWN: "warn",
  NOT_APPLICABLE: "neutral",
};

/** At most this many issues reach the card; the rest stay on the page. */
const MAX_ISSUES = 2;

function text(titleCode: string, language: Language, params?: Record<string, unknown>): string {
  const resolved = resolveMessage(
    params === undefined
      ? { titleCode }
      : { titleCode, params: params as Record<string, string | number | boolean> },
    language,
  );
  return resolved.title === "" ? titleCode : resolved.title;
}

const DATE_LOCALE: Readonly<Record<Language, string>> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-GB",
};

/**
 * PRD 23.7 — when the observation was made, not when the card was drawn. A card that travels for
 * a week should not keep claiming to be about today, and the moment a reader forwards is the
 * moment the checks actually ran.
 */
function observedAt(scan: ScanLike, language: Language): string | undefined {
  const moments = scan.categories
    .flatMap((category) => category.checks ?? [])
    .map((check) => check.freshness?.checkedAt)
    .filter((value): value is string => value !== undefined);
  const latest = scan.completedAt ?? moments.sort().at(-1);
  if (latest === undefined) {
    return undefined;
  }
  const parsed = new Date(latest);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toLocaleString(DATE_LOCALE[language], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function buildShareCardModel(scan: ScanLike, language: Language, ui: Ui): ShareCardModel {
  const summary = scan.summary;
  const overall = scan.mode === "FULL" && summary?.state === "FINAL";
  const verdictCode = overall ? summary?.verdictCode : undefined;

  return {
    // The canonical name, never the string the reader typed (AC-23.8, AC-24.7).
    domain: scan.canonicalDomain.unicodeHostname,
    ...(verdictCode === undefined ? {} : { verdict: text(`verdict.${verdictCode}`, language) }),
    ...(overall && summary?.score !== undefined ? { score: summary.score } : {}),
    tone: verdictCode === undefined ? "neutral" : (VERDICT_TONE[verdictCode] ?? "neutral"),
    confidence:
      summary === undefined ? "" : text(`confidence.${summary.confidence.level}`, language),
    categories: scan.categories.map((category) => {
      const checks = category.checks ?? [];
      return {
        name: text(`category.${category.category}`, language),
        status: ui.statusWords[category.status as keyof Ui["statusWords"]] ?? category.status,
        tone: STATUS_TONE[category.status] ?? "neutral",
        // N/A is not a check that failed and not one that passed, so it counts in neither.
        passed: checks.filter((check) => check.status === "PASS").length,
        total: checks.filter((check) => check.status !== "NOT_APPLICABLE").length,
      };
    }),
    issues: (summary?.issues ?? []).slice(0, MAX_ISSUES).map((issue) => ({
      title: text(issue.message.titleCode, language, issue.message.params),
      severity: ui.severityLabels[issue.severity as keyof Ui["severityLabels"]] ?? issue.severity,
    })),
    footer: ui.shareFooter,
    checksLabel: ui.shareChecksLabel,
    ...(() => {
      const moment = observedAt(scan, language);
      return moment === undefined ? {} : { checkedAt: `${ui.shareCheckedAt}: ${moment}` };
    })(),
  };
}

/**
 * The card is drawn light whatever theme the page is in: it is going to land in a messenger, a
 * document or a ticket, and a predictable sheet of paper reads better there than a dark panel
 * that fights whatever surrounds it.
 */
const CARD = {
  width: 1200,
  height: 630,
  scale: 2,
  pad: 64,
  paper: "#f5f3ee",
  ink: "#16151a",
  muted: "#55535e",
  faint: "#84818d",
  rule: "#dcd7cc",
  tones: { pass: "#1a7f37", warn: "#8a5a00", fail: "#b42318", neutral: "#16151a" },
  sans: '600 1px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: "1px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

function font(stack: string, size: number, weight?: string): string {
  return stack
    .replace("1px", `${size}px`)
    .replace(/^\d+ /, weight === undefined ? "" : `${weight} `);
}

/** Greedy wrap; the card has room for a couple of lines, not a paragraph. */
function wrap(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/)) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (context.measureText(candidate).width <= maxWidth || current === "") {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) {
        break;
      }
    }
  }
  if (lines.length < maxLines && current !== "") {
    lines.push(current);
  }
  const last = lines.length - 1;
  if (lines.length === maxLines && last >= 0) {
    let tail = lines[last] ?? "";
    while (tail.length > 1 && context.measureText(`${tail}…`).width > maxWidth) {
      tail = tail.slice(0, -1);
    }
    if (context.measureText(value).width > maxWidth * maxLines) {
      lines[last] = `${tail.trimEnd()}…`;
    }
  }
  return lines;
}

/** PRD 23.9 — the card is rendered on demand, in the browser, from the result already in hand. */
export async function renderShareCard(model: ShareCardModel): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD.width * CARD.scale;
  canvas.height = CARD.height * CARD.scale;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("canvas is unavailable");
  }
  context.scale(CARD.scale, CARD.scale);
  const tone = CARD.tones[model.tone];

  context.fillStyle = CARD.paper;
  context.fillRect(0, 0, CARD.width, CARD.height);
  context.fillStyle = tone;
  context.fillRect(0, 0, CARD.width, 6);

  const left = CARD.pad;
  const right = CARD.width - CARD.pad;

  context.fillStyle = CARD.faint;
  context.font = font(CARD.mono, 18);
  context.fillText("2check.uz", left, CARD.pad + 6);

  context.fillStyle = CARD.ink;
  context.font = font(CARD.sans, 52, "700");
  const domain = wrap(context, model.domain, right - left - 220, 1);
  context.fillText(domain[0] ?? model.domain, left, CARD.pad + 82);

  let y = CARD.pad + 158;
  if (model.verdict !== undefined) {
    context.fillStyle = tone;
    context.font = font(CARD.sans, 40, "700");
    for (const line of wrap(context, model.verdict, right - left - 220, 2)) {
      context.fillText(line, left, y);
      y += 48;
    }
  }

  context.fillStyle = CARD.muted;
  context.font = font(CARD.mono, 20);
  context.fillText(model.confidence.toUpperCase(), left, y + 8);

  // The score sits in the top right, where the eye lands after the name.
  if (model.score !== undefined) {
    context.textAlign = "right";
    context.fillStyle = CARD.ink;
    context.font = font(CARD.sans, 92, "700");
    context.fillText(String(model.score), right, CARD.pad + 108);
    context.fillStyle = CARD.faint;
    context.font = font(CARD.mono, 18);
    context.fillText("/ 100", right, CARD.pad + 140);
    context.textAlign = "left";
  }

  // The lower two thirds, from the top down: what was checked, then what to fix, then the footer.
  const footerY = CARD.height - 36;

  context.strokeStyle = CARD.rule;
  context.beginPath();
  context.moveTo(left, 300);
  context.lineTo(right, 300);
  context.stroke();

  let row = 334;
  for (const category of model.categories) {
    context.fillStyle = CARD.ink;
    context.font = font(CARD.sans, 23, "700");
    context.fillText(category.name, left, row);

    context.fillStyle = CARD.muted;
    context.font = font(CARD.mono, 17);
    context.fillText(`${category.passed}/${category.total}`, left + 190, row);

    context.fillStyle = CARD.faint;
    context.font = font(CARD.mono, 17);
    context.fillText(model.checksLabel, left + 260, row);

    context.textAlign = "right";
    // The colour belongs to this category's own outcome, not to the overall verdict.
    context.fillStyle = CARD.tones[category.tone];
    context.font = font(CARD.mono, 17, "600");
    context.fillText(category.status.toUpperCase(), right, row);
    context.textAlign = "left";
    row += 34;
  }

  row += 14;
  for (const issue of model.issues) {
    context.fillStyle = CARD.faint;
    context.font = font(CARD.mono, 15);
    context.fillText(issue.severity.toUpperCase(), left, row);
    context.fillStyle = CARD.ink;
    context.font = font(CARD.sans, 22, "600");
    context.fillText(wrap(context, issue.title, right - left, 1)[0] ?? issue.title, left, row + 26);
    row += 50;
  }

  // Its own baseline, so a long line of categories cannot run into it.
  context.fillStyle = CARD.faint;
  context.font = font(CARD.mono, 16);
  context.fillText(model.footer, left, footerY);
  if (model.checkedAt !== undefined) {
    context.textAlign = "right";
    context.fillStyle = CARD.muted;
    context.fillText(model.checkedAt, right, footerY);
    context.textAlign = "left";
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("the card could not be encoded"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
