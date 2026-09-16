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
  /**
   * What stands in the verdict's place when there is no verdict to state. Without it a reader
   * receives a card with one section on it and no way to tell whether the rest passed, failed or
   * was never looked at.
   */
  readonly partialLabel?: string;
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
  /**
   * The checks themselves, under the category they belong to. A tally — "4/4 passed" — scores
   * the test rather than describing the domain: it tells a reader that somebody was satisfied,
   * not what was found. The resolved titles say the findings out loud — which protocol the
   * server negotiated, how long the certificate still has — and a scan of one category has the
   * room for them.
   */
  readonly checks?: readonly {
    readonly title: string;
    readonly status: string;
    readonly tone: ShareCardModel["tone"];
  }[];
  /** Already phrased, e.g. "и ещё 3", when the category holds more checks than the card lists. */
  readonly moreChecks?: string;
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
      readonly message?: {
        readonly titleCode: string;
        readonly params?: Record<string, unknown>;
      };
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

/** How many check lines fit under a category before the card starts counting the rest. */
const MAX_LISTED_CHECKS = 6;

/**
 * Which checks earn a line when they do not all fit. A finding is news; a pass is reassurance;
 * "does not apply" is neither, and goes last.
 */
const CHECK_PRIORITY: Readonly<Record<string, number>> = {
  FAIL: 0,
  UNKNOWN: 1,
  PASS: 2,
  NOT_APPLICABLE: 3,
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
    ...(verdictCode === undefined
      ? { partialLabel: ui.sharePartial }
      : { verdict: text(`verdict.${verdictCode}`, language) }),
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
    ...(() => {
      // Only a scan of one category has room to name its checks. A full scan runs fifteen of
      // them, and there the categories are the summary — with the issues saying what went wrong.
      const single = scan.categories.length === 1 ? scan.categories[0] : undefined;
      const checks = single?.checks ?? [];
      if (checks.length === 0) {
        return {};
      }
      // Stable, so checks of equal standing keep the order the scan produced them in.
      const ordered = [...checks].sort(
        (left, right) =>
          (CHECK_PRIORITY[left.status ?? ""] ?? 9) - (CHECK_PRIORITY[right.status ?? ""] ?? 9),
      );
      const listed = ordered.slice(0, MAX_LISTED_CHECKS);
      const hidden = ordered.length - listed.length;
      return {
        checks: listed.map((check) => ({
          title:
            check.message === undefined
              ? (check.status ?? "")
              : text(check.message.titleCode, language, check.message.params),
          status: ui.statusWords[check.status as keyof Ui["statusWords"]] ?? check.status ?? "",
          tone: STATUS_TONE[check.status ?? ""] ?? "neutral",
        })),
        ...(hidden > 0
          ? { moreChecks: ui.shareMoreChecks.replace("{count}", String(hidden)) }
          : {}),
      };
    })(),
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

/**
 * PRD 23.9 — the card is rendered on demand, in the browser, from the result already in hand.
 *
 * The layout flows rather than sitting at fixed coordinates, and the card is only as tall as what
 * it has to say. A single-category scan was previously drawn into a frame built for three
 * categories and two issues, and arrived two thirds empty — which reads as a broken image rather
 * than as a short answer.
 */
const MIN_HEIGHT = 400;
const FOOTER_GAP = 34;

interface Plan {
  readonly height: number;
  readonly domain: string;
  readonly headline: readonly string[];
  readonly issues: readonly string[];
  readonly contentEnd: number;
}

function plan(context: CanvasRenderingContext2D, model: ShareCardModel): Plan {
  const width = CARD.width - CARD.pad * 2;
  // The score sits in the top right, so the lines beside it get less room.
  const headroom = model.score === undefined ? width : width - 220;

  context.font = font(CARD.sans, 52, "700");
  const domain = wrap(context, model.domain, headroom, 1)[0] ?? model.domain;

  const headlineText = model.verdict ?? model.partialLabel;
  context.font = font(CARD.sans, 40, "700");
  const headline = headlineText === undefined ? [] : wrap(context, headlineText, headroom, 2);

  context.font = font(CARD.sans, 22, "600");
  const issues = model.issues.map(
    (issue) => wrap(context, issue.title, width, 1)[0] ?? issue.title,
  );

  let y = CARD.pad + 68;
  if (headline.length > 0) {
    y += 58 + (headline.length - 1) * 48;
  }
  if (model.confidence !== "") {
    y += 40;
  }
  y += 38;
  y += 36 + model.categories.length * 34;
  if (model.checks !== undefined) {
    y += 6 + model.checks.length * 32 + (model.moreChecks === undefined ? 0 : 26);
  }
  if (issues.length > 0) {
    y += 20 + issues.length * 52;
  }

  return {
    height: Math.max(MIN_HEIGHT, y + FOOTER_GAP + 30),
    domain,
    headline,
    issues,
    contentEnd: y,
  };
}

export async function renderShareCard(model: ShareCardModel): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD.width * CARD.scale;
  // Provisional, so text can be measured; the real height comes from the plan below.
  canvas.height = 1200 * CARD.scale;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("canvas is unavailable");
  }
  context.scale(CARD.scale, CARD.scale);
  const measured = plan(context, model);

  // Resizing clears the canvas and resets the transform, which is exactly what is wanted here.
  canvas.height = measured.height * CARD.scale;
  context.scale(CARD.scale, CARD.scale);

  const tone = CARD.tones[model.tone];
  const left = CARD.pad;
  const right = CARD.width - CARD.pad;

  context.fillStyle = CARD.paper;
  context.fillRect(0, 0, CARD.width, measured.height);
  context.fillStyle = tone;
  context.fillRect(0, 0, CARD.width, 6);

  let y = CARD.pad + 6;
  context.fillStyle = CARD.faint;
  context.font = font(CARD.mono, 18);
  context.fillText("2check.uz", left, y);

  y += 62;
  context.fillStyle = CARD.ink;
  context.font = font(CARD.sans, 52, "700");
  context.fillText(measured.domain, left, y);

  if (measured.headline.length > 0) {
    y += 58;
    // A verdict is coloured by its own tone; "partial check" is a statement of scope, not a
    // judgement, so it stays ink.
    context.fillStyle = model.verdict === undefined ? CARD.muted : tone;
    context.font = font(CARD.sans, 40, "700");
    for (const [index, line] of measured.headline.entries()) {
      context.fillText(line, left, y + index * 48);
    }
    y += (measured.headline.length - 1) * 48;
  }

  if (model.confidence !== "") {
    y += 40;
    context.fillStyle = CARD.muted;
    context.font = font(CARD.mono, 20);
    context.fillText(model.confidence.toUpperCase(), left, y);
  }

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

  y += 38;
  context.strokeStyle = CARD.rule;
  context.beginPath();
  context.moveTo(left, y);
  context.lineTo(right, y);
  context.stroke();

  y += 36;
  for (const category of model.categories) {
    context.fillStyle = CARD.ink;
    context.font = font(CARD.sans, 23, "700");
    context.fillText(category.name, left, y);

    context.fillStyle = CARD.muted;
    context.font = font(CARD.mono, 17);
    context.fillText(`${category.passed}/${category.total}`, left + 190, y);

    context.fillStyle = CARD.faint;
    context.fillText(model.checksLabel, left + 260, y);

    context.textAlign = "right";
    // The colour belongs to this category's own outcome, not to the overall verdict.
    context.fillStyle = CARD.tones[category.tone];
    context.font = font(CARD.mono, 17, "600");
    context.fillText(category.status.toUpperCase(), right, y);
    context.textAlign = "left";
    y += 34;
  }

  // The findings themselves, indented under the category that produced them.
  if (model.checks !== undefined) {
    y += 6;
    const indent = left + 22;
    for (const check of model.checks) {
      context.fillStyle = CARD.faint;
      context.font = font(CARD.mono, 15);
      context.fillText("—", left, y);

      context.fillStyle = CARD.ink;
      context.font = font(CARD.sans, 21, "600");
      context.fillText(
        wrap(context, check.title, right - indent - 200, 1)[0] ?? check.title,
        indent,
        y,
      );

      context.textAlign = "right";
      context.fillStyle = CARD.tones[check.tone];
      context.font = font(CARD.mono, 16, "600");
      context.fillText(check.status.toUpperCase(), right, y);
      context.textAlign = "left";
      y += 32;
    }
    if (model.moreChecks !== undefined) {
      context.fillStyle = CARD.faint;
      context.font = font(CARD.mono, 16);
      context.fillText(model.moreChecks, indent, y);
      y += 26;
    }
  }

  if (measured.issues.length > 0) {
    y += 20;
    for (const [index, title] of measured.issues.entries()) {
      context.fillStyle = CARD.faint;
      context.font = font(CARD.mono, 15);
      context.fillText((model.issues[index]?.severity ?? "").toUpperCase(), left, y);
      context.fillStyle = CARD.ink;
      context.font = font(CARD.sans, 22, "600");
      context.fillText(title, left, y + 26);
      y += 52;
    }
  }

  const footerY = measured.height - FOOTER_GAP;
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
