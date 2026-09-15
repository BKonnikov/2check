import type { Metadata } from "next";
import { CHROME, isLocale, LANGUAGE_OF, type Locale } from "../../../../_components/chrome";
import DomainChecker, { type ScanView } from "../../../../_components/DomainChecker";

/**
 * PRD 24.2 and AC-24.1 — an individual scan page is always noindex, whatever the verdict, score
 * or cache state, and it carries no canonical that could invite indexing.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

/**
 * PRD 24.6 and AC-24.6 — a crawler GET reads an existing scan and never starts a network check.
 * This page only reads; starting a scan requires the form to be submitted.
 */
async function readScan(scanId: string): Promise<ScanView | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/web/v1/scans/${scanId}`, {
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as ScanView) : null;
  } catch {
    return null;
  }
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string; scanId: string }>;
}) {
  const { locale, scanId } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  const chrome = CHROME[key];
  const scan = await readScan(scanId);

  if (scan === null) {
    return (
      <>
        <h1>{chrome.scanTitle}</h1>
        <p className="lede">{chrome.scanMissing}</p>
      </>
    );
  }

  return (
    <>
      <h1>{chrome.scanTitle}</h1>
      <p className="lede">{scan.canonicalDomain.unicodeHostname}</p>
      <DomainChecker language={LANGUAGE_OF[key]} ui={chrome.ui} initialScan={scan} />
    </>
  );
}
