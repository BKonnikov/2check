import { resolveMessage } from "@2check/messages";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  CHROME,
  isLocale,
  LANGUAGE_OF,
  LOCALE_NAMES,
  LOCALES,
  type Locale,
} from "../../_components/chrome";
import HeaderNav from "../../_components/HeaderNav";
import "../../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/** PRD 23.4 — the short names in the interface are DNS, Домен and SSL/TLS. */
function categoryName(code: string, locale: Locale): string {
  const resolved = resolveMessage({ titleCode: `category.${code}` }, LANGUAGE_OF[locale]);
  return resolved.title === "" ? code : resolved.title;
}

/**
 * PRD 24.1 — the root layout of the localised pages. `<html lang>` carries the locale actually
 * being served, which is why this route group has its own root layout.
 */
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
  const key = locale as Locale;
  const chrome = CHROME[key];
  const ui = chrome.ui;

  return (
    <html lang={key}>
      <body>
        <a className="skip" href="#content">
          {ui.skipToContent}
        </a>
        <HeaderNav
          locale={key}
          locales={LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code] }))}
          languageLabel={ui.languageNav}
          toolsLabel={ui.toolsNav}
          tabs={[
            { href: `/${key}`, label: ui.navHome },
            { href: `/${key}/dns-check`, label: categoryName("dns", key) },
            { href: `/${key}/whois`, label: categoryName("registry", key) },
            { href: `/${key}/ssl-check`, label: categoryName("tls", key) },
          ]}
        />
        <main id="content">{children}</main>
        <footer className="site-footer">
          <div>
            <p>{ui.footerNote}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
