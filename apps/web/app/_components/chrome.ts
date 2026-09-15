import type { Language } from "@2check/messages";

/** PRD 24.1 — the locale prefixes the product serves. */
export const LOCALES = ["ru", "uz", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const LANGUAGE_OF: Readonly<Record<Locale, Language>> = { ru: "ru", uz: "uz", en: "en" };

export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "https://2check.uz";

interface Chrome {
  readonly tagline: string;
  readonly homeTitle: string;
  readonly homeDescription: string;
  readonly toolTitles: Readonly<Record<"dns" | "whois" | "ssl", string>>;
  readonly toolDescriptions: Readonly<Record<"dns" | "whois" | "ssl", string>>;
  /** PRD 24.5 — the body copy states only what the product actually does. */
  readonly toolBody: Readonly<Record<"dns" | "whois" | "ssl", readonly string[]>>;
  readonly scanTitle: string;
  readonly scanMissing: string;
}

/**
 * PRD 24.5 and AC-24.4 — no claim beyond the product boundary.
 * The DNS copy does not promise geographically distributed checks, the WHOIS copy does not
 * promise every TLD, and the SSL copy does not promise cipher grading, HSTS, OCSP or HTTP checks.
 */
export const CHROME: Readonly<Record<Locale, Chrome>> = {
  ru: {
    tagline: "Проверка технического здоровья домена простым языком.",
    homeTitle: "2check.uz — проверка здоровья домена",
    homeDescription:
      "Проверка DNS, регистрации домена и сертификата SSL/TLS с понятным объяснением результата.",
    toolTitles: {
      dns: "Проверка DNS",
      whois: "Проверка регистрации домена",
      ssl: "Проверка сертификата SSL/TLS",
    },
    toolDescriptions: {
      dns: "Сравнение ответов четырёх публичных резолверов: существование имени, записи и расхождения.",
      whois: "Данные о регистрации домена в зоне .uz по RDAP с резервным запросом WHOIS.",
      ssl: "Срок действия сертификата, соответствие имени хоста и доверие цепочки по адресам IPv4 и IPv6.",
    },
    toolBody: {
      dns: [
        "2check запрашивает записи A, AAAA, MX, TXT, NS, CNAME и SOA у четырёх публичных резолверов — Google, Cloudflare, Yandex Basic и Quad9 — и сравнивает их ответы между собой.",
        "Это сравнение резолверов, а не проверка из разных стран: все запросы уходят с одной площадки. Географически распределённая проверка в текущую версию не входит.",
        "Отдельно различаются случаи, когда имени нет вовсе и когда имя есть, а записи такого типа нет.",
      ],
      whois: [
        "Данные о регистрации запрашиваются по RDAP, а если определённого ответа нет — резервным запросом WHOIS.",
        "Поддерживается зона .uz. Домены других зон 2check по регистрации не проверяет и честно сообщает об этом вместо того, чтобы гадать.",
        "Фактические контактные данные регистранта в результат не попадают — показывается только, заполнено поле, скрыто или недоступно.",
      ],
      ssl: [
        "2check подключается к порту 443 по одному представительному адресу на каждое семейство — IPv4 и IPv6 — и разбирает предъявленный сертификат.",
        "Проверяются срок действия, соответствие имени хоста по SAN и доверие цепочки. Оценка наборов шифров, HSTS, OCSP и проверки HTTP в эту версию не входят.",
        "Содержимое страниц не загружается: выполняется только TLS-рукопожатие.",
      ],
    },
    scanTitle: "Результат проверки",
    scanMissing: "Такое сканирование не найдено или срок его хранения истёк.",
  },
  en: {
    tagline: "Domain technical health explained in plain language.",
    homeTitle: "2check.uz — domain health check",
    homeDescription:
      "Check DNS, domain registration and the SSL/TLS certificate, with the result explained plainly.",
    toolTitles: {
      dns: "DNS check",
      whois: "Domain registration check",
      ssl: "SSL/TLS certificate check",
    },
    toolDescriptions: {
      dns: "Compares the answers of four public resolvers: name existence, records and disagreements.",
      whois: "Registration data for the .uz zone over RDAP, with a WHOIS fallback.",
      ssl: "Certificate validity, hostname match and chain trust over IPv4 and IPv6.",
    },
    toolBody: {
      dns: [
        "2check asks four public resolvers — Google, Cloudflare, Yandex Basic and Quad9 — for the A, AAAA, MX, TXT, NS, CNAME and SOA records, and compares their answers.",
        "This is a resolver comparison, not a check from several countries: every query leaves from one location. Geographically distributed checking is not part of this version.",
        "A name that does not exist is reported separately from a name that exists without a record of that type.",
      ],
      whois: [
        "Registration data is retrieved over RDAP, and where that is not determinate, over WHOIS.",
        "The .uz zone is supported. For other zones 2check does not check registration and says so, rather than guessing.",
        "Registrant contact values never reach the result: it shows only whether a field is present, redacted or unavailable.",
      ],
      ssl: [
        "2check connects to port 443 on one representative address per family — IPv4 and IPv6 — and reads the certificate that is presented.",
        "It checks validity dates, the hostname against the subject alternative names, and chain trust. Cipher grading, HSTS, OCSP and HTTP checks are not part of this version.",
        "No page content is fetched: only the TLS handshake is performed.",
      ],
    },
    scanTitle: "Scan result",
    scanMissing: "This scan is unknown or has expired.",
  },
  uz: {
    tagline: "Domain technical health explained in plain language.",
    homeTitle: "2check.uz — domain health check",
    homeDescription:
      "Check DNS, domain registration and the SSL/TLS certificate, with the result explained plainly.",
    toolTitles: {
      dns: "DNS check",
      whois: "Domain registration check",
      ssl: "SSL/TLS certificate check",
    },
    toolDescriptions: {
      dns: "Compares the answers of four public resolvers: name existence, records and disagreements.",
      whois: "Registration data for the .uz zone over RDAP, with a WHOIS fallback.",
      ssl: "Certificate validity, hostname match and chain trust over IPv4 and IPv6.",
    },
    toolBody: {
      dns: [
        "2check asks four public resolvers — Google, Cloudflare, Yandex Basic and Quad9 — for the A, AAAA, MX, TXT, NS, CNAME and SOA records, and compares their answers.",
        "This is a resolver comparison, not a check from several countries: every query leaves from one location. Geographically distributed checking is not part of this version.",
        "A name that does not exist is reported separately from a name that exists without a record of that type.",
      ],
      whois: [
        "Registration data is retrieved over RDAP, and where that is not determinate, over WHOIS.",
        "The .uz zone is supported. For other zones 2check does not check registration and says so, rather than guessing.",
        "Registrant contact values never reach the result: it shows only whether a field is present, redacted or unavailable.",
      ],
      ssl: [
        "2check connects to port 443 on one representative address per family — IPv4 and IPv6 — and reads the certificate that is presented.",
        "It checks validity dates, the hostname against the subject alternative names, and chain trust. Cipher grading, HSTS, OCSP and HTTP checks are not part of this version.",
        "No page content is fetched: only the TLS handshake is performed.",
      ],
    },
    scanTitle: "Scan result",
    scanMissing: "This scan is unknown or has expired.",
  },
};

/** PRD 24.1 — the pages that may be indexed. Scan routes are never among them. */
export const INDEXABLE_PATHS = ["", "/dns-check", "/whois", "/ssl-check"] as const;

/** PRD 24.3 — each language page is its own canonical and links to the others by hreflang. */
export function alternates(path: string) {
  return {
    canonical: `${SITE_ORIGIN}/ru${path}`,
    languages: {
      ru: `${SITE_ORIGIN}/ru${path}`,
      uz: `${SITE_ORIGIN}/uz${path}`,
      en: `${SITE_ORIGIN}/en${path}`,
      "x-default": `${SITE_ORIGIN}${path === "" ? "/" : path}`,
    },
  };
}

export function localeAlternates(locale: Locale, path: string) {
  return { ...alternates(path), canonical: `${SITE_ORIGIN}/${locale}${path}` };
}
