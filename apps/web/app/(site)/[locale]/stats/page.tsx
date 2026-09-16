import type { Metadata } from "next";
import { isLocale, type Locale, localeAlternates } from "../../../_components/chrome";
import StatsView from "../../../_components/StatsView";
import type { PublicStats } from "../../../_components/stats";
import { STATS } from "../../../_components/stats";

const PATH = "/stats";

/** Read at request time; the API holds the figures and refreshes them on its own schedule. */
export const dynamic = "force-dynamic";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

async function readStats(): Promise<PublicStats | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/web/v1/stats`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as PublicStats) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  return {
    title: STATS[key].title,
    description: STATS[key].description,
    alternates: localeAlternates(key, PATH),
  };
}

export default async function StatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  const copy = STATS[key];
  const stats = await readStats();

  if (stats === null) {
    return (
      <>
        <h1>{copy.title}</h1>
        <p className="lede">{copy.description}</p>
        <p className="error">{copy.unavailable}</p>
      </>
    );
  }

  return <StatsView copy={copy} locale={key} stats={stats} />;
}
