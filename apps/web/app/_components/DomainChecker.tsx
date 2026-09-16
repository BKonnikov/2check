"use client";

import type {
  AnalyticsLocale,
  AnalyticsScope,
  AnalyticsTool,
  ScanCategory,
  TechnicalCheckDetail,
} from "@2check/contracts";
import { WEB_API_BASE_PATH } from "@2check/contracts";
import { type Language, resolveMessage } from "@2check/messages";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { type AnalyticsDimensions, track } from "./analytics";
import type { Ui } from "./chrome";
import ShareActions from "./ShareActions";

/** PRD 13.1 — an input rejection is a message like any other: what, why, and what to do. */
interface ErrorView {
  readonly title: string;
  readonly explanation?: string;
  readonly recommendation?: string;
}

interface MessageDescriptorView {
  titleCode: string;
  params?: Record<string, string | number | boolean>;
}

interface CheckView {
  checkId: string;
  status: string;
  severity: string;
  reasonCode?: string;
  message: MessageDescriptorView;
  freshness: { checkedAt: string; cached: boolean; cacheAge: number };
  details?: Record<string, unknown> | null;
}

interface CategoryView {
  category: string;
  status: string;
  completeness: string;
  checks: CheckView[];
}

interface SummaryView {
  state: string;
  verdictCode?: string;
  score?: number;
  confidence: { level: string; unknownChecksCount: number; affectedCategories: string[] };
  issueCounts: { critical: number; warning: number; informational: number };
  issues: {
    issueId: string;
    category: string;
    severity: string;
    primaryCheckId: string;
    message: MessageDescriptorView;
  }[];
}

interface ScanView {
  scanId: string;
  executionState: string;
  mode: string;
  summary?: SummaryView;
  canonicalDomain: {
    unicodeHostname: string;
    asciiHostname: string;
    publicSuffix: string | null;
    publicSuffixType: string;
    registrableDomain: string | null;
    isIdn: boolean;
  };
  selectedCategories: string[];
  categories: CategoryView[];
  completedAt?: string;
  completionReason?: string;
  pollAfterMs?: number;
}

/** AC-23.9 — a status is carried by a mark and a word, never by colour alone. */
const STATUS_MARK: Record<string, string> = {
  PASS: "✓",
  FAIL: "✕",
  UNKNOWN: "?",
  NOT_APPLICABLE: "—",
};

const DATE_LOCALE: Record<Language, string> = { ru: "ru-RU", uz: "uz-UZ", en: "en-GB" };

/**
 * PRD 23.7 — this is the moment of observation, so it is shown as a moment a reader recognises
 * rather than an ISO string. The server renders it in its own zone and the browser in the
 * reader's, which is exactly the case suppressHydrationWarning exists for; the exact instant
 * stays available in the title attribute.
 */
function moment(iso: string, language: Language): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleString(DATE_LOCALE[language], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Comfortably past the server's own scan budget (PRD 22.2), never shorter than it. */
const POLL_BUDGET_MS = 75_000;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

function title(
  titleCode: string,
  language: Language,
  params?: Record<string, string | number | boolean>,
): string {
  const resolved = resolveMessage(
    params === undefined ? { titleCode } : { titleCode, params },
    language,
  );
  return resolved.title === "" ? titleCode : resolved.title;
}

function message(descriptor: MessageDescriptorView, language: Language) {
  return resolveMessage(
    descriptor.params === undefined
      ? { titleCode: descriptor.titleCode }
      : { titleCode: descriptor.titleCode, params: descriptor.params },
    language,
  );
}

/**
 * PRD 23.6 — the Technical exposure level, fetched from /details when the reader opens it.
 *
 * The public result says which checks ran and how they came out; this says what was actually
 * seen — the name that was queried, what each resolver answered, the certificate's issuer and
 * dates, the registration record. It is fetched on first open rather than with the result,
 * because most readers never ask for it.
 */
const ISO_MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * A name as it stands in the certificate is prefixed with the kind of name it is — "DNS:olx.uz".
 * The prefix is how the certificate is encoded, not something a reader asked about.
 */
function certificateName(entry: string): string {
  return entry.replace(/^(DNS|IP Address|URI|email):/i, "");
}

/**
 * Answers sort the way a reader expects to read them: an MX record by its priority, everything
 * else alphabetically. Resolvers answer in whatever order they please, and an unordered list is
 * impossible to compare against the one below it.
 */
function compareAnswers(left: string, right: string): number {
  const a = /^(\d+)\s+(.*)$/.exec(left);
  const b = /^(\d+)\s+(.*)$/.exec(right);
  if (a !== null && b !== null) {
    const byPriority = Number(a[1]) - Number(b[1]);
    return byPriority === 0 ? (a[2] ?? "").localeCompare(b[2] ?? "") : byPriority;
  }
  return left.localeCompare(right);
}

export interface AnswerGroup {
  readonly providers: readonly string[];
  readonly answers: readonly string[];
}

/**
 * Resolvers that answered identically are one group. Exported because this is the rule the
 * block is for, and it is worth a test rather than an eyeball.
 */
export function groupAnswers(value: Record<string, unknown>): readonly AnswerGroup[] {
  const groups = new Map<string, { providers: string[]; answers: string[] }>();
  for (const [provider, answers] of Object.entries(value)) {
    const list = (Array.isArray(answers) ? answers.map(String) : []).sort(compareAnswers);
    const signature = JSON.stringify(list);
    const group = groups.get(signature);
    if (group === undefined) {
      groups.set(signature, { providers: [provider], answers: list });
    } else {
      group.providers.push(provider);
    }
  }
  return [...groups.values()];
}

/**
 * PRD 8.3 — what each resolver answered.
 *
 * Four resolvers usually answer identically, and printing the same thirty TXT records four times
 * over is how a disclosure becomes unreadable. Identical answers are therefore shown once, named
 * for the resolvers that gave them; only a resolver that actually differs gets its own block,
 * which is also the case worth looking at.
 */
function AnswersByProvider({ value, ui }: { value: Record<string, unknown>; ui: Ui }) {
  const entries = groupAnswers(value);
  const unanimous = entries.length === 1;

  return (
    <ul className="detail-sub">
      {entries.map((group) => (
        <li className="answer-group" key={group.providers.join(",")}>
          <span className="detail-key">
            {unanimous ? ui.allResolvers : group.providers.join(", ")}
          </span>
          {group.answers.length === 0 ? (
            <span>{ui.none}</span>
          ) : (
            <ul className="answers">
              {group.answers.map((answer) => (
                <li key={answer}>{answer}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/** PRD 8.3 — the services the records point at, named rather than left as raw tokens. */
function RecognisedServices({ value, ui }: { value: readonly unknown[]; ui: Ui }) {
  return (
    <ul className="detail-sub">
      {value.map((entry) => {
        const service = entry as { name?: string; kind?: string };
        return (
          <li key={`${service.kind}-${service.name}`}>
            <span className="detail-key">
              {ui.serviceKinds[service.kind as keyof Ui["serviceKinds"]] ?? service.kind}
            </span>
            <span>{service.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

function renderValue(value: unknown, ui: Ui, language: Language, key?: string): ReactNode {
  if (value === null || value === undefined || value === "") {
    return ui.none;
  }
  if (typeof value === "boolean") {
    return value ? ui.yes : ui.no;
  }
  // A moment is shown as a moment. Nobody reads 2026-10-29T12:17:53.000Z as a date.
  if (typeof value === "string" && ISO_MOMENT.test(value)) {
    return (
      <time dateTime={value} suppressHydrationWarning title={value}>
        {moment(value, language)}
      </time>
    );
  }
  if (typeof value === "string" && key === "subjectAltNames") {
    return certificateName(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ui.none;
    }
    if (key === "recognisedServices") {
      return <RecognisedServices ui={ui} value={value} />;
    }
    // A list of records — one per resolver, say — reads as rows, not as "[object Object]".
    if (
      value.every((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry))
    ) {
      return (
        <ul className="detail-sub">
          {value.map((entry, index) => {
            const [head, ...rest] = Object.entries(entry as Record<string, unknown>);
            return (
              <li key={`${String(head?.[1] ?? index)}`}>
                <span className="detail-key">{String(head?.[1] ?? "")}</span>
                <span>{rest.map(([, nested]) => String(nested)).join(" · ") || ui.none}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    if (key === "subjectAltNames") {
      return value.map((entry) => certificateName(String(entry))).join(" · ");
    }
    return value.map((entry) => String(entry)).join(", ");
  }
  if (typeof value === "object") {
    if (key === "answersByProvider") {
      return <AnswersByProvider ui={ui} value={value as Record<string, unknown>} />;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    // PRD 9.4 — a registrant field carries a state and never a value, so it reads as one word.
    if (entries.length === 1 && entries[0]?.[0] === "state") {
      const state = String(entries[0][1]);
      return ui.detailLabels[state] ?? state;
    }
    return (
      <ul className="detail-sub">
        {entries.map(([nestedKey, nested]) => (
          <li key={nestedKey}>
            <span className="detail-key">{ui.detailLabels[nestedKey] ?? nestedKey}</span>
            <span>{renderValue(nested, ui, language, nestedKey)}</span>
          </li>
        ))}
      </ul>
    );
  }
  const scalar = String(value);
  // Machine words like REPRESENTATIVE are a contract value, not something to put in front of a
  // reader untranslated.
  return ui.detailLabels[scalar] ?? scalar;
}

function DetailRows({
  source,
  ui,
  language,
}: {
  source: Record<string, unknown>;
  ui: Ui;
  language: Language;
}) {
  const rows = Object.entries(source).filter(([key]) => key !== "kind");
  if (rows.length === 0) {
    return null;
  }
  return (
    <dl>
      {rows.map(([key, value]) => (
        <div className="detail-row" key={key}>
          <dt>{ui.detailLabels[key] ?? key}</dt>
          <dd>
            {renderValue(value, ui, language, key)}
            {/* A label alone does not explain a wildcard, a fingerprint or a chain. */}
            {ui.detailHints[key] !== undefined && (
              <span className="detail-hint">{ui.detailHints[key]}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TechnicalDetails({
  scanId,
  named,
  ui,
  language,
  onOpen,
}: {
  scanId: string;
  named: ReadonlyMap<string, { title: string; status: string }>;
  ui: Ui;
  language: Language;
  onOpen: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [checks, setChecks] = useState<readonly TechnicalCheckDetail[]>([]);

  async function load(): Promise<void> {
    if (phase !== "idle") {
      return;
    }
    setPhase("loading");
    try {
      const response = await fetch(`${WEB_API_BASE_PATH}/scans/${scanId}/details`);
      if (!response.ok) {
        setPhase("error");
        return;
      }
      const body = (await response.json()) as { checks?: readonly TechnicalCheckDetail[] };
      setChecks(body.checks ?? []);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }

  return (
    <details
      className="section"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          onOpen();
          void load();
        }
      }}
    >
      <summary>{ui.technicalHeading}</summary>
      <div className="technical">
        <p className="technical-note">{ui.technicalNote}</p>
        {phase === "loading" && <p className="muted">{ui.technicalLoading}</p>}
        {phase === "error" && <p className="error">{ui.technicalError}</p>}
        {phase === "ready" &&
          checks.map((check) => {
            const known = named.get(check.checkId);
            return (
              <div className="detail" key={check.checkId}>
                <div className="detail-head">
                  <span className="check-name">{known?.title ?? check.checkId}</span>
                  {known !== undefined && <StatusMark status={known.status} ui={ui} />}
                </div>
                <span className="check-id">{check.checkId}</span>
                <DetailRows
                  language={language}
                  source={check.target as unknown as Record<string, unknown>}
                  ui={ui}
                />
                {check.source !== undefined && (
                  <DetailRows
                    language={language}
                    source={check.source as unknown as Record<string, unknown>}
                    ui={ui}
                  />
                )}
                {check.details !== undefined && (
                  <DetailRows
                    language={language}
                    source={check.details as Record<string, unknown>}
                    ui={ui}
                  />
                )}
              </div>
            );
          })}
      </div>
    </details>
  );
}

function StatusMark({ status, ui }: { status: string; ui: Ui }) {
  const word = ui.statusWords[status as keyof Ui["statusWords"]] ?? status;
  return (
    <span className={`mark st-${status}`}>
      <span aria-hidden="true">[{STATUS_MARK[status] ?? "·"}]</span> {word}
    </span>
  );
}

/** PRD 23.7 — the age of cached data must be visible; completedAt never stands in for checkedAt. */
function Freshness({
  freshness,
  ui,
  language,
}: {
  freshness: CheckView["freshness"];
  ui: Ui;
  language: Language;
}) {
  if (!freshness.cached) {
    return null;
  }
  const minutes = Math.round(freshness.cacheAge / 60);
  return (
    <span
      className="freshness"
      title={`${ui.observedAt}: ${moment(freshness.checkedAt, language)}`}
    >
      {minutes > 0 ? fill(ui.cachedAgo, { minutes }) : ui.cached}
    </span>
  );
}

export type { ScanView };

export interface DomainCheckerProps {
  readonly language: Language;
  readonly ui: Ui;
  /** PRD 28.3 — which page this is, as a bounded value rather than a URL. */
  readonly tool: AnalyticsTool;
  /** PRD 3.3 and 17.2 — a tool page runs PARTIAL over its own category; the home page runs FULL. */
  readonly categories?: readonly ScanCategory[];
  /** PRD 24.6 and AC-24.6 — a scan already read from the server; nothing is started on load. */
  readonly initialScan?: ScanView | null;
}

export default function DomainChecker({
  language,
  ui,
  tool,
  categories,
  initialScan = null,
}: DomainCheckerProps) {
  // PRD 23.8 — re-running a scan read from its own page needs the domain it was run for.
  const [input, setInput] = useState(initialScan?.canonicalDomain.unicodeHostname ?? "");
  const [scan, setScan] = useState<ScanView | null>(initialScan);
  const [error, setError] = useState<ErrorView | null>(null);
  const [running, setRunning] = useState(false);

  const scope: AnalyticsScope =
    categories === undefined || categories.length === 0 ? "all" : (categories[0] ?? "all");
  const partial = categories !== undefined && categories.length > 0;
  const dimensions: AnalyticsDimensions = {
    locale: language as AnalyticsLocale,
    tool,
    mode: partial ? "PARTIAL" : "FULL",
    scope,
  };

  // PRD 28.5 — the first step of the funnel, and the only measure of traffic the product keeps.
  // A view is counted once per mount; `dimensions` is rebuilt every render and listing it would
  // count the same page again on every keystroke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: one view, one count.
  useEffect(() => {
    track(initialScan === null ? "scan_form_viewed" : "scan_result_viewed", dimensions);
  }, []);

  async function start(value: string, cacheMode?: "FORCE_REFRESH"): Promise<void> {
    track(cacheMode === undefined ? "scan_submitted" : "refresh_clicked", dimensions);
    setError(null);
    setScan(null);
    setRunning(true);

    try {
      const created = await fetch(`${WEB_API_BASE_PATH}/scans`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: value,
          // PRD 17.2 — FULL carries no selectedCategories; PARTIAL carries a proper subset.
          ...(categories === undefined || categories.length === 0
            ? { mode: "FULL" }
            : { mode: "PARTIAL", selectedCategories: categories }),
          ...(cacheMode === undefined ? {} : { cacheMode }),
        }),
      });
      const acceptance = await created.json();
      if (created.ok) {
        track("scan_accepted", dimensions);
      }
      if (!created.ok) {
        setError(message({ titleCode: `web.error.${acceptance.errorCode}` }, language));
        return;
      }

      /**
       * PRD 17.3 — the authoritative state is read through GET, never returned by POST.
       *
       * The server guarantees a terminal state within its own scan budget, so this waits
       * comfortably longer than that: giving up first would show a timeout for a scan that was
       * about to answer, which is what it used to do when the two budgets were nearly equal.
       */
      const waitUntil = Date.now() + POLL_BUDGET_MS;
      while (Date.now() < waitUntil) {
        const response = await fetch(`${WEB_API_BASE_PATH}/scans/${acceptance.scanId}`);
        const body: ScanView = await response.json();
        setScan(body);
        if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
          track("scan_result_viewed", {
            ...dimensions,
            outcome: body.executionState,
            ...(body.summary?.verdictCode === undefined
              ? {}
              : { verdictCode: body.summary.verdictCode as never }),
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, body.pollAfterMs ?? 400));
      }
      setError({ title: ui.errorTimeout });
    } catch {
      setError({ title: ui.errorNetwork });
    } finally {
      setRunning(false);
    }
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    void start(input);
  }

  const summary = scan?.summary;
  // AC-23.3 — a PARTIAL scan shows no overall verdict and no overall score.
  const showOverall = scan?.mode === "FULL" && summary?.state === "FINAL";
  const domain = scan?.canonicalDomain;
  // PRD 23.7 — the reader should be able to see that something was reused, and ask for a fresh run.
  const anyCached =
    scan?.categories.some((category) => category.checks.some((check) => check.freshness.cached)) ??
    false;

  return (
    <>
      <form className="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="domain">
          {ui.inputLabel}
        </label>
        <input
          id="domain"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={ui.inputPlaceholder}
          autoComplete="off"
          spellCheck={false}
          required
        />
        <button type="submit" disabled={running}>
          {running ? ui.submitBusy : ui.submit}
        </button>
      </form>
      <p className="hint">{ui.inputHint}</p>

      {error !== null && (
        <div className="section sheet" role="alert">
          <p className="error">{error.title}</p>
          {error.explanation !== undefined && <p className="muted">{error.explanation}</p>}
          {error.recommendation !== undefined && (
            <p className="recommendation">{error.recommendation}</p>
          )}
        </div>
      )}

      {/* PRD 23.2 — during execution: visible category states, no percentage, no score. */}
      {scan !== null && scan.executionState !== "COMPLETED" && scan.executionState !== "FAILED" && (
        <section className="section" aria-live="polite">
          <h2>{ui.runningHeading}</h2>
          <ul className="running">
            {scan.selectedCategories.map((category) => (
              <li key={category}>
                <span className="pulse" aria-hidden="true" />
                {title(`category.${category}`, language)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showOverall && summary?.verdictCode !== undefined && (
        <section
          className={`section sheet verdict v-${summary.verdictCode}`}
          aria-labelledby="verdict-heading"
        >
          <div className="verdict-body">
            <h2 id="verdict-heading" className="sr-only">
              {ui.verdictHeading}
            </h2>
            <p className="verdict-line">{title(`verdict.${summary.verdictCode}`, language)}</p>
            {message({ titleCode: `verdict.${summary.verdictCode}` }, language).explanation !==
              undefined && (
              <p className="muted">
                {message({ titleCode: `verdict.${summary.verdictCode}` }, language).explanation}
              </p>
            )}
            {scan?.completionReason === "DEADLINE_TERMINALIZED" && (
              <p className="confidence">{ui.deadlineNote}</p>
            )}
            {anyCached && <p className="confidence">{ui.cachedResults}</p>}
            <p className="confidence">
              {title(`confidence.${summary.confidence.level}`, language)}
              {summary.confidence.unknownChecksCount > 0 &&
                ` · ${fill(ui.unknownChecks, { count: summary.confidence.unknownChecksCount })}`}
            </p>
          </div>
          {summary.score !== undefined && (
            <div className="score" style={{ ["--value" as string]: summary.score }}>
              <span className="score-num">{summary.score}</span>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" />
                <div className="meter-ticks" />
              </div>
              <span className="score-label">{ui.scoreLabel}</span>
            </div>
          )}
        </section>
      )}

      {/* AC-23.4 — only confirmed problems appear here; UNKNOWN never does. */}
      {summary !== undefined && summary.issues.length > 0 && (
        <section className="section" aria-labelledby="issues-heading">
          <h2 id="issues-heading">{ui.issuesHeading}</h2>
          <ul className="issues">
            {summary.issues.map((issue) => {
              const resolved = message(issue.message, language);
              const severity = issue.severity as keyof Ui["severityLabels"];
              return (
                <li key={issue.issueId} className={`sev-${issue.severity}`}>
                  <p className="issue-meta">
                    {ui.severityLabels[severity] ?? issue.severity} ·{" "}
                    {title(`category.${issue.category}`, language)}
                  </p>
                  <p className="issue-title">{resolved.title}</p>
                  {resolved.explanation !== undefined && (
                    <p className="muted">{resolved.explanation}</p>
                  )}
                  {resolved.impact !== undefined && <p className="muted">{resolved.impact}</p>}
                  {resolved.recommendation !== undefined && (
                    <p className="recommendation">{resolved.recommendation}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {scan?.categories.map((category, index) => (
        <section
          className="section"
          key={category.category}
          aria-labelledby={`cat-${category.category}`}
        >
          <div className="cat-head">
            <h2 className="cat-name" id={`cat-${category.category}`}>
              <span className="cat-index">{String(index + 1).padStart(2, "0")}</span>
              {title(`category.${category.category}`, language)}
              {category.completeness === "PARTIAL" && (
                <span className="cat-note">{ui.partialCategory}</span>
              )}
            </h2>
            <StatusMark status={category.status} ui={ui} />
          </div>
          <ul className="checks">
            {category.checks.map((check) => {
              const resolved = message(check.message, language);
              return (
                <li key={check.checkId}>
                  <span className="check-title">
                    {resolved.title || check.checkId}
                    {/* What the check actually looked at, for a reader who has not met the
                        term before. A passing check needs this as much as a failing one. */}
                    {resolved.explanation !== undefined && (
                      <span className="check-explanation">{resolved.explanation}</span>
                    )}
                  </span>
                  <span className="check-meta">
                    <Freshness freshness={check.freshness} ui={ui} language={language} />
                    <StatusMark status={check.status} ui={ui} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* PRD 23.6 — technical detail is a disclosure, closed by default and keyboard operable. */}
      {scan !== null && scan.executionState === "COMPLETED" && domain !== undefined && (
        <TechnicalDetails
          language={language}
          onOpen={() => track("technical_details_opened", dimensions)}
          scanId={scan.scanId}
          named={
            new Map(
              scan.categories.flatMap((category) =>
                category.checks.map((check) => [
                  check.checkId,
                  {
                    title: message(check.message, language).title || check.checkId,
                    status: check.status,
                  },
                ]),
              ),
            )
          }
          ui={ui}
        />
      )}

      {/* PRD 23.9 — for a COMPLETED scan: share, copy or save the result as an image. */}
      {scan !== null && scan.executionState === "COMPLETED" && (
        <ShareActions scan={scan} language={language} ui={ui} dimensions={dimensions} />
      )}

      {/* PRD 23.8 — refreshing creates a new FORCE_REFRESH scan, never patches this one. */}
      {scan !== null && scan.executionState === "COMPLETED" && (
        <p className="refresh">
          <button
            type="button"
            className="secondary"
            disabled={running || input.trim().length === 0}
            onClick={() => void start(input, "FORCE_REFRESH")}
          >
            {ui.recheck}
          </button>
          <span className="hint refresh-note">{ui.recheckNote}</span>
        </p>
      )}
    </>
  );
}
