"use client";

import { usePathname } from "next/navigation";

export interface NavTab {
  readonly href: string;
  readonly label: string;
}

export interface LocaleOption {
  readonly code: string;
  readonly name: string;
}

/** The locale segment of the current path, so switching language keeps the page. */
const LOCALE_PREFIX = /^\/(?:ru|uz|en)(?=\/|$)/;

/**
 * The header is a client component for one reason: the current path decides which tab is marked
 * `aria-current` and what the language links point at. PRD 24.3 — the same page in another
 * language, not the home page in another language.
 */
export default function HeaderNav({
  locale,
  locales,
  languageLabel,
  toolsLabel,
  tabs,
}: {
  readonly locale: string;
  readonly locales: readonly LocaleOption[];
  readonly languageLabel: string;
  readonly toolsLabel: string;
  readonly tabs: readonly NavTab[];
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const withoutLocale = pathname.replace(LOCALE_PREFIX, "");

  return (
    <header className="site-header">
      <div className="bar">
        <a className="brand" href={`/${locale}`}>
          <span className="brand-mark" aria-hidden="true">
            2✓
          </span>
          <span>
            2check<span className="brand-tld">.uz</span>
          </span>
        </a>
        <nav className="lang" aria-label={languageLabel}>
          {locales.map((option) => (
            <a
              key={option.code}
              href={`/${option.code}${withoutLocale}`}
              hrefLang={option.code}
              {...(option.code === locale ? { "aria-current": "page" as const } : {})}
            >
              {option.name}
            </a>
          ))}
        </nav>
      </div>
      <nav className="tabs" aria-label={toolsLabel}>
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            {...(pathname === tab.href ? { "aria-current": "page" as const } : {})}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
