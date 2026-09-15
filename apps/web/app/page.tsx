"use client";

import { WEB_API_BASE_PATH } from "@2check/contracts";
import { type Language, resolveMessage } from "@2check/messages";
import { type FormEvent, useState } from "react";

const LANGUAGE: Language = "ru";

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

/** AC-23.9 — status is conveyed by a mark and a word, never by colour alone. */
const STATUS_MARK: Record<string, string> = {
  PASS: "✓",
  FAIL: "✕",
  UNKNOWN: "?",
  NOT_APPLICABLE: "—",
};

const STATUS_WORD: Record<string, string> = {
  PASS: "пройдено",
  FAIL: "проблема",
  UNKNOWN: "не проверено",
  NOT_APPLICABLE: "неприменимо",
};

function title(titleCode: string, params?: Record<string, string | number | boolean>): string {
  const resolved = resolveMessage(
    params === undefined ? { titleCode } : { titleCode, params },
    LANGUAGE,
  );
  return resolved.title === "" ? titleCode : resolved.title;
}

function message(descriptor: MessageDescriptorView) {
  return resolveMessage(
    descriptor.params === undefined
      ? { titleCode: descriptor.titleCode }
      : { titleCode: descriptor.titleCode, params: descriptor.params },
    LANGUAGE,
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status ${status}`}>
      <span aria-hidden="true">{STATUS_MARK[status] ?? "·"}</span>{" "}
      <span className="sr-only">{STATUS_WORD[status] ?? status}</span>
    </span>
  );
}

/** PRD 23.7 — the age of cached data must be visible; completedAt never stands in for checkedAt. */
function Freshness({ freshness }: { freshness: CheckView["freshness"] }) {
  if (!freshness.cached) {
    return null;
  }
  const minutes = Math.round(freshness.cacheAge / 60);
  return (
    <span className="freshness" title={`Наблюдение: ${freshness.checkedAt}`}>
      из кэша{minutes > 0 ? `, ${minutes} мин назад` : ""}
    </span>
  );
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [scan, setScan] = useState<ScanView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [technical, setTechnical] = useState(false);

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
          mode: "FULL",
          ...(cacheMode === undefined ? {} : { cacheMode }),
        }),
      });
      const acceptance = await created.json();
      if (!created.ok) {
        setError(title(`web.error.${acceptance.errorCode}`));
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
      setError("Проверка не завершилась за отведённое время");
    } catch {
      setError("Не удалось связаться с сервисом");
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
    <main>
      <h1>2check.uz</h1>
      <p className="lede">Проверка технического здоровья домена простым языком.</p>

      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="domain">
          Домен
        </label>
        <input
          id="domain"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="example.uz"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={running || input.trim().length === 0}>
          {running ? "Проверяю…" : "Проверить"}
        </button>
      </form>

      {error !== null && (
        <div className="panel" role="alert">
          <p className="error">{error}</p>
        </div>
      )}

      {/* PRD 23.2 — during execution: visible category states, no percentage, no score. */}
      {scan !== null && scan.executionState !== "COMPLETED" && scan.executionState !== "FAILED" && (
        <div className="panel" aria-live="polite">
          <h2>Выполняется</h2>
          <ul className="running">
            {scan.selectedCategories.map((category) => (
              <li key={category}>{title(`category.${category}`)}</li>
            ))}
          </ul>
        </div>
      )}

      {showOverall && summary?.verdictCode !== undefined && (
        <section className="panel verdict" aria-labelledby="verdict-heading">
          <div>
            <h2 id="verdict-heading" className="sr-only">
              Вердикт
            </h2>
            <p className="verdict-line">{title(`verdict.${summary.verdictCode}`)}</p>
            <p className="muted">
              {title(`confidence.${summary.confidence.level}`)}
              {summary.confidence.unknownChecksCount > 0 &&
                ` · не удалось проверить: ${summary.confidence.unknownChecksCount}`}
            </p>
            {message({ titleCode: `verdict.${summary.verdictCode}` }).explanation !== undefined && (
              <p className="muted">
                {message({ titleCode: `verdict.${summary.verdictCode}` }).explanation}
              </p>
            )}
          </div>
          {summary.score !== undefined && (
            <p className="score">
              <span className="score-value">{summary.score}</span>
              <span className="muted"> / 100</span>
            </p>
          )}
        </section>
      )}

      {/* AC-23.4 — only confirmed problems appear here; UNKNOWN never does. */}
      {summary !== undefined && summary.issues.length > 0 && (
        <section className="panel" aria-labelledby="issues-heading">
          <h2 id="issues-heading">Проблемы</h2>
          <ul className="issues">
            {summary.issues.map((issue) => {
              const resolved = message(issue.message);
              return (
                <li key={issue.issueId}>
                  <p className="issue-title">
                    <StatusBadge status="FAIL" /> {resolved.title}
                  </p>
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
          className="panel"
          key={category.category}
          aria-labelledby={`cat-${category.category}`}
        >
          <h2 id={`cat-${category.category}`}>
            {title(`category.${category.category}`)}{" "}
            {category.completeness === "PARTIAL" && (
              <span className="muted note">проверено не полностью</span>
            )}
          </h2>
          <ul className="checks">
            {category.checks.map((check) => {
              const resolved = message(check.message);
              return (
                <li key={check.checkId}>
                  <StatusBadge status={check.status} />
                  <span className="check-title">{resolved.title || check.checkId}</span>
                  <Freshness freshness={check.freshness} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {scan !== null && scan.executionState === "COMPLETED" && (
        <section className="panel">
          <h2>
            <button
              type="button"
              className="link"
              aria-expanded={technical}
              onClick={() => setTechnical((value) => !value)}
            >
              Технические подробности
            </button>
          </h2>
          {technical && domain !== undefined && (
            <div className="technical">
              <dl>
                <dt>Имя</dt>
                <dd>{domain.unicodeHostname}</dd>
                <dt>ASCII</dt>
                <dd>{domain.asciiHostname}</dd>
                <dt>Публичный суффикс</dt>
                <dd>
                  {domain.publicSuffix ?? "—"} ({domain.publicSuffixType})
                </dd>
                <dt>Регистрируемый домен</dt>
                <dd>{domain.registrableDomain ?? "—"}</dd>
              </dl>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Проверка</th>
                      <th scope="col">Статус</th>
                      <th scope="col">Причина</th>
                      <th scope="col">Наблюдение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scan.categories.flatMap((category) =>
                      category.checks.map((check) => (
                        <tr key={check.checkId}>
                          <td className="mono">{check.checkId}</td>
                          <td>
                            <StatusBadge status={check.status} /> {check.status}
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
          )}
        </section>
      )}

      {/* PRD 23.8 — refreshing creates a new FORCE_REFRESH scan, never patches this one. */}
      {scan !== null && scan.executionState === "COMPLETED" && (
        <p>
          <button
            type="button"
            className="secondary"
            disabled={running}
            onClick={() => void start(input, "FORCE_REFRESH")}
          >
            Проверить заново
          </button>
        </p>
      )}
    </main>
  );
}
