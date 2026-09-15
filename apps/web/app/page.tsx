"use client";

import { WEB_API_BASE_PATH } from "@2check/contracts";
import { type FormEvent, useState } from "react";

interface CheckView {
  checkId: string;
  status: string;
  severity: string;
  reasonCode?: string;
  details?: { state?: string; answersByProvider?: Record<string, string[]> };
}

interface ScanView {
  scanId: string;
  executionState: string;
  canonicalDomain: {
    unicodeHostname: string;
    asciiHostname: string;
    publicSuffix: string | null;
    publicSuffixType: string;
    registrableDomain: string | null;
    isIdn: boolean;
  };
  categories: { category: string; status: string; completeness: string; checks: CheckView[] }[];
  pollAfterMs?: number;
}

function observedValues(check: CheckView): string {
  const byProvider = check.details?.answersByProvider ?? {};
  const values = new Set(Object.values(byProvider).flat());
  const listed = [...values].slice(0, 4);
  return values.size > 4 ? `${listed.join(", ")}, …` : listed.join(", ");
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [scan, setScan] = useState<ScanView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setScan(null);
    setRunning(true);

    try {
      const created = await fetch(`${WEB_API_BASE_PATH}/scans`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input, mode: "PARTIAL", selectedCategories: ["dns"] }),
      });
      const acceptance = await created.json();
      if (!created.ok) {
        setError(acceptance.errorCode ?? `HTTP ${created.status}`);
        return;
      }

      // PRD 17.3 — the authoritative state is read through GET, never returned by POST.
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const response = await fetch(`${WEB_API_BASE_PATH}/scans/${acceptance.scanId}`);
        const body: ScanView = await response.json();
        setScan(body);
        if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, body.pollAfterMs ?? 400));
      }
      setError("scan_timeout");
    } catch {
      setError("network_error");
    } finally {
      setRunning(false);
    }
  }

  const domain = scan?.canonicalDomain;

  return (
    <main>
      <h1>2check.uz</h1>
      <p className="lede">Проверка технического здоровья домена. Пока доступна категория DNS.</p>

      <form onSubmit={submit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="example.uz"
          aria-label="Домен"
        />
        <button type="submit" disabled={running || input.trim().length === 0}>
          {running ? "Проверяю…" : "Проверить"}
        </button>
      </form>

      {error !== null && (
        <div className="panel">
          <h2>Ошибка</h2>
          <p className="error">{error}</p>
        </div>
      )}

      {domain !== undefined && (
        <div className="panel">
          <h2>Домен</h2>
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
            <dt>IDN</dt>
            <dd>{domain.isIdn ? "да" : "нет"}</dd>
          </dl>
        </div>
      )}

      {scan?.categories.map((category) => (
        <div className="panel" key={category.category}>
          <h2>
            {category.category} —{" "}
            <span className={`status ${category.status}`}>{category.status}</span>
            <span className="severity">полнота: {category.completeness}</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Проверка</th>
                <th>Статус</th>
                <th>Состояние</th>
                <th>Значения</th>
              </tr>
            </thead>
            <tbody>
              {category.checks.map((check) => (
                <tr key={check.checkId}>
                  <td className="check">{check.checkId}</td>
                  <td>
                    <span className={`status ${check.status}`}>{check.status}</span>
                    {check.severity !== "none" && (
                      <span className="severity">{check.severity}</span>
                    )}
                    {check.reasonCode !== undefined && (
                      <span className="severity">{check.reasonCode}</span>
                    )}
                  </td>
                  <td className="muted">{check.details?.state ?? "—"}</td>
                  <td className="values">{observedValues(check)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {scan !== null && scan.executionState !== "COMPLETED" && scan.executionState !== "FAILED" && (
        <p className="muted">Состояние: {scan.executionState}…</p>
      )}
    </main>
  );
}
