import type { Metadata } from "next";
import {
  CHROME,
  isLocale,
  LANGUAGE_OF,
  type Locale,
  localeAlternates,
} from "../_components/chrome";
import DomainChecker from "../_components/DomainChecker";

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
  return <DomainChecker language={LANGUAGE_OF[key]} />;
}
