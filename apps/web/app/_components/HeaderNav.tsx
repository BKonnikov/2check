"use client";

import { usePathname } from "next/navigation";
import { LOCALE_COOKIE } from "./chrome";
import ThemeToggle from "./ThemeToggle";

export interface NavTab {
  readonly href: string;
  readonly label: string;
}

export interface LocaleOption {
  readonly code: string;
  readonly name: string;
}

/** The locale segment of the current path, so switching language keeps the page. */
/**
 * Choosing a language here is an explicit decision, so "/" honours it on the next visit instead
 * of falling back to the browser's Accept-Language. A year-long functional cookie holding one of
 * three locale codes is the whole mechanism; it carries nothing else.
 */
function remember(locale: string): void {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is still missing in Safari and Firefox.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // A browser that refuses cookies still follows the link.
  }
}

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
  themeLabel,
  toolsLabel,
  tabs,
}: {
  readonly locale: string;
  readonly locales: readonly LocaleOption[];
  readonly languageLabel: string;
  readonly themeLabel: string;
  readonly toolsLabel: string;
  readonly tabs: readonly NavTab[];
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const withoutLocale = pathname.replace(LOCALE_PREFIX, "");

  return (
    <header className="site-header">
      <div className="bar">
        <a className="brand" href={`/${locale}`}>
          2check<span className="brand-tld">.uz</span>
        </a>
        <div className="controls">
          <nav className="lang" aria-label={languageLabel}>
            {locales.map((option) => (
              <a
                key={option.code}
                href={`/${option.code}${withoutLocale}`}
                hrefLang={option.code}
                onClick={() => remember(option.code)}
                {...(option.code === locale ? { "aria-current": "page" as const } : {})}
              >
                {option.name}
              </a>
            ))}
          </nav>
          <ThemeToggle label={themeLabel} />
        </div>
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
