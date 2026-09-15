import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CHROME, isLocale, type Locale } from "../_components/chrome";

export function generateStaticParams() {
  return [{ locale: "ru" }, { locale: "uz" }, { locale: "en" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const chrome = CHROME[locale as Locale];

  return (
    <main lang={locale}>
      <header>
        <h1>
          <a href={`/${locale}`}>2check.uz</a>
        </h1>
        <p className="lede">{chrome.tagline}</p>
        <nav aria-label="Инструменты" className="tools">
          <a href={`/${locale}/dns-check`}>{chrome.toolTitles.dns}</a>
          <a href={`/${locale}/whois`}>{chrome.toolTitles.whois}</a>
          <a href={`/${locale}/ssl-check`}>{chrome.toolTitles.ssl}</a>
        </nav>
      </header>
      {children}
    </main>
  );
}
