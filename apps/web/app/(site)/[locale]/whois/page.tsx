import type { Metadata } from "next";
import {
  CHROME,
  isLocale,
  LANGUAGE_OF,
  type Locale,
  localeAlternates,
} from "../../../_components/chrome";
import DomainChecker from "../../../_components/DomainChecker";

const PATH = "/whois";
const KEY = "whois" as const;
/** PRD 3.3 — this page runs PARTIAL over one category, not a full scan. */
const CATEGORIES = ["registry"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  return {
    title: CHROME[key].toolTitles[KEY],
    description: CHROME[key].toolDescriptions[KEY],
    alternates: localeAlternates(key, PATH),
  };
}

export default async function ToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  const chrome = CHROME[key];

  return (
    <>
      <h1>{chrome.toolTitles[KEY]}</h1>
      <p className="lede">{chrome.toolDescriptions[KEY]}</p>
      <DomainChecker language={LANGUAGE_OF[key]} ui={chrome.ui} categories={CATEGORIES} />
      <section className="card">
        <h2>{chrome.ui.aboutHeading}</h2>
        {chrome.toolBody[KEY].map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
        <p className="muted">{chrome.ui.scopeNote}</p>
      </section>
    </>
  );
}
