import type { Metadata } from "next";
import {
  CHROME,
  isLocale,
  LANGUAGE_OF,
  type Locale,
  localeAlternates,
} from "../../_components/chrome";
import DomainChecker from "../../_components/DomainChecker";

const PATH = "/dns-check";
const KEY = "dns" as const;

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
      <section className="panel">
        <h2>{chrome.toolTitles[KEY]}</h2>
        {chrome.toolBody[KEY].map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </section>
      <DomainChecker language={LANGUAGE_OF[key]} />
    </>
  );
}
