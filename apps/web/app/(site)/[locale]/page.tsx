import type { Metadata } from "next";
import {
  CHROME,
  isLocale,
  LANGUAGE_OF,
  type Locale,
  localeAlternates,
} from "../../_components/chrome";
import DomainChecker from "../../_components/DomainChecker";

const TOOLS = [
  { path: "/dns-check", key: "dns" },
  { path: "/whois", key: "whois" },
  { path: "/ssl-check", key: "ssl" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  return {
    title: CHROME[key].homeTitle,
    description: CHROME[key].homeDescription,
    alternates: localeAlternates(key, ""),
  };
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  const chrome = CHROME[key];
  return (
    <>
      <h1>{chrome.ui.homeHeading}</h1>
      <p className="lede">{chrome.tagline}</p>
      <DomainChecker language={LANGUAGE_OF[key]} ui={chrome.ui} tool="home" />
      {/* PRD 24.5 — the home page says what the three checks are, in the same words as the tool pages. */}
      <div className="tiles">
        {TOOLS.map((tool, index) => (
          <a className="tile" key={tool.path} href={`/${key}${tool.path}`}>
            <span className="tile-index">{String(index + 1).padStart(2, "0")}</span>
            <h2>{chrome.toolTitles[tool.key]}</h2>
            <p>{chrome.toolDescriptions[tool.key]}</p>
          </a>
        ))}
      </div>
    </>
  );
}
