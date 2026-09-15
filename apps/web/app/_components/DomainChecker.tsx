"use client";

import type { ScanCategory } from "@2check/contracts";
import { WEB_API_BASE_PATH } from "@2check/contracts";
import { type Language, resolveMessage } from "@2check/messages";
import { type FormEvent, useState } from "react";
import type { Ui } from "./chrome";

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
  pollAfterMs?: number;
}

/** AC-23.9 — a status is carried by a mark and a word, never by colour alone. */
const STATUS_MARK: Record<string, string> = {
  PASS: "✓",
  FAIL: "✕",
  UNKNOWN: "?",
  NOT_APPLICABLE: "—",
};

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

function StatusChip({ status, ui }: { status: string; ui: Ui }) {
  const word = ui.statusWords[status as keyof Ui["statusWords"]] ?? status;
  return (
    <span className={`chip chip-${status}`}>
      <span className="mark" aria-hidden="true">
        {STATUS_MARK[status] ?? "·"}
      </span>
      {word}
    </span>
  );
}

/** PRD 23.7 — the age of cached data must be visible; completedAt never stands in for checkedAt. */
function Freshness({ freshness, ui }: { freshness: CheckView["freshness"]; ui: Ui }) {
  if (!freshness.cached) {
    return null;
  }
  const minutes = Math.round(freshness.cacheAge / 60);
  return (
    <span className="freshness" title={`${ui.observedAt}: ${freshness.checkedAt}`}>
      {minutes > 0 ? fill(ui.cachedAgo, { minutes }) : ui.cached}
    </span>
  );
}

export type { ScanView };

export interface DomainCheckerProps {
  readonly language: Language;
  readonly ui: Ui;
  /** PRD 3.3 and 17.2 — a tool page runs PARTIAL over its own category; the home page runs FULL. */
  readonly categories?: readonly ScanCategory[];
  /** PRD 24.6 and AC-24.6 — a scan already read from the server; nothing is started on load. */
  readonly initialScan?: ScanView | null;
}

export default function DomainChecker({
  language,
  ui,
  categories,
  initialScan = null,
}: DomainCheckerProps) {
  // PRD 23.8 — re-running a scan read from its own page needs the domain it was run for.
  const [input, setInput] = useState(initialScan?.canonicalDomain.unicodeHostname ?? "");
  const [scan, setScan] = useState<ScanView | null>(initialScan);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function start(value: string, cacheMode?: "FORCE_REFRESH"): Promise<void> {
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
      if (!created.ok) {
        setError(title(`web.error.${acceptance.errorCode}`, language));
        return;
      }

      // PRD 17.3 — the authoritative state is read through GET, never returned by POST.
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const response = await fetch(`${WEB_API_BASE_PATH}/scans/${acceptance.scanId}`);
        const body: ScanView = await response.json();
        setScan(body);
        if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, body.pollAfterMs ?? 400));
      }
      setError(ui.errorTimeout);
    } catch {
      setError(ui.errorNetwork);
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
        <div className="card" role="alert">
          <p className="error">{error}</p>
        </div>
      )}

      {/* PRD 23.2 — during execution: visible category states, no percentage, no score. */}
      {scan !== null && scan.executionState !== "COMPLETED" && scan.executionState !== "FAILED" && (
        <div className="card" aria-live="polite">
          <h2>{ui.runningHeading}</h2>
          <ul className="running">
            {scan.selectedCategories.map((category) => (
              <li key={category}>
                <span className="pulse" aria-hidden="true" />
                {title(`category.${category}`, language)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showOverall && summary?.verdictCode !== undefined && (
        <section
          className={`card verdict v-${summary.verdictCode}`}
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
            <p className="muted">
              {title(`confidence.${summary.confidence.level}`, language)}
              {summary.confidence.unknownChecksCount > 0 &&
                ` · ${fill(ui.unknownChecks, { count: summary.confidence.unknownChecksCount })}`}
            </p>
          </div>
          {summary.score !== undefined && (
            <div className="score" style={{ ["--value" as string]: summary.score }}>
              <div className="score-inner">
                <span className="score-value">{summary.score}</span>
                <span className="score-label">{ui.scoreLabel}</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* AC-23.4 — only confirmed problems appear here; UNKNOWN never does. */}
      {summary !== undefined && summary.issues.length > 0 && (
        <section className="card" aria-labelledby="issues-heading">
          <h2 id="issues-heading">{ui.issuesHeading}</h2>
          <ul className="issues">
            {summary.issues.map((issue) => {
              const resolved = message(issue.message, language);
              const severity = issue.severity as keyof Ui["severityLabels"];
              return (
                <li key={issue.issueId} className={`sev-${issue.severity}`}>
                  <div className="issue-head">
                    <p className="issue-title">{resolved.title}</p>
                    <span className="freshness">
                      {ui.severityLabels[severity] ?? issue.severity} ·{" "}
                      {title(`category.${issue.category}`, language)}
                    </span>
                  </div>
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

      {scan?.categories.map((category) => (
        <section
          className="card"
          key={category.category}
          aria-labelledby={`cat-${category.category}`}
        >
          <div className="cat-head">
            <h2 className="cat-name" id={`cat-${category.category}`}>
              {title(`category.${category.category}`, language)}{" "}
              {category.completeness === "PARTIAL" && (
                <span className="cat-note">{ui.partialCategory}</span>
              )}
            </h2>
            <StatusChip status={category.status} ui={ui} />
          </div>
          <ul className="checks">
            {category.checks.map((check) => {
              const resolved = message(check.message, language);
              return (
                <li key={check.checkId}>
                  <span className="check-title">{resolved.title || check.checkId}</span>
                  <span className="check-meta">
                    <Freshness freshness={check.freshness} ui={ui} />
                    <StatusChip status={check.status} ui={ui} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* PRD 23.6 — technical detail is a disclosure, closed by default and keyboard operable. */}
      {scan !== null && scan.executionState === "COMPLETED" && domain !== undefined && (
        <details className="card">
          <summary>{ui.technicalHeading}</summary>
          <div className="technical">
            <dl>
              <dt>{ui.technicalFields.name}</dt>
              <dd>{domain.unicodeHostname}</dd>
              <dt>{ui.technicalFields.ascii}</dt>
              <dd>{domain.asciiHostname}</dd>
              <dt>{ui.technicalFields.suffix}</dt>
              <dd>
                {domain.publicSuffix ?? "—"} ({domain.publicSuffixType})
              </dd>
              <dt>{ui.technicalFields.registrable}</dt>
              <dd>{domain.registrableDomain ?? "—"}</dd>
            </dl>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{ui.tableHeads.check}</th>
                    <th scope="col">{ui.tableHeads.status}</th>
                    <th scope="col">{ui.tableHeads.reason}</th>
                    <th scope="col">{ui.tableHeads.observed}</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.categories.flatMap((category) =>
                    category.checks.map((check) => (
                      <tr key={check.checkId}>
                        <td className="mono">{check.checkId}</td>
                        <td>
                          <StatusChip status={check.status} ui={ui} />
                        </td>
                        <td className="mono">{check.reasonCode ?? "—"}</td>
                        <td className="mono">{check.freshness.checkedAt}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}

      {/* PRD 23.8 — refreshing creates a new FORCE_REFRESH scan, never patches this one. */}
      {scan !== null && scan.executionState === "COMPLETED" && (
        <p>
          <button
            type="button"
            className="secondary"
            disabled={running || input.trim().length === 0}
            onClick={() => void start(input, "FORCE_REFRESH")}
          >
            {ui.recheck}
          </button>
        </p>
      )}
    </>
  );
}
