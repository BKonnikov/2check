import type { Language } from "@2check/messages";

/** PRD 24.1 — the locale prefixes the product serves. */
export const LOCALES = ["ru", "uz", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const LANGUAGE_OF: Readonly<Record<Locale, Language>> = { ru: "ru", uz: "uz", en: "en" };

export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "https://2check.uz";

/**
 * PRD 13.6 and AC-13.7 — every interface string exists in every mandatory language.
 * Keeping it a typed record means a missing translation is a type error, not a silent fallback
 * to Russian on a page served in Uzbek.
 */
export interface Ui {
  readonly skipToContent: string;
  readonly navHome: string;
  readonly aboutNav: string;
  readonly homeHeading: string;
  readonly toolsNav: string;
  readonly languageNav: string;
  readonly theme: string;
  readonly inputLabel: string;
  readonly inputPlaceholder: string;
  readonly inputHint: string;
  readonly submit: string;
  readonly submitBusy: string;
  readonly runningHeading: string;
  readonly verdictHeading: string;
  readonly scoreLabel: string;
  readonly unknownChecks: string;
  readonly issuesHeading: string;
  readonly severityLabels: Readonly<Record<"critical" | "warning" | "informational", string>>;
  readonly statusWords: Readonly<Record<"PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE", string>>;
  readonly partialCategory: string;
  readonly technicalHeading: string;
  readonly technicalNote: string;
  readonly technicalFields: Readonly<Record<"name" | "ascii" | "suffix" | "registrable", string>>;
  readonly tableHeads: Readonly<Record<"check" | "status" | "reason" | "observed", string>>;
  readonly recheck: string;
  readonly cached: string;
  readonly cachedAgo: string;
  readonly observedAt: string;
  readonly errorTimeout: string;
  readonly errorNetwork: string;
  readonly aboutHeading: string;
  readonly scopeNote: string;
  readonly footerNote: string;
}

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
  readonly ui: Ui;
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
    ui: {
      skipToContent: "К содержимому",
      navHome: "Полная проверка",
      aboutNav: "О проекте",
      homeHeading: "Проверка домена",
      toolsNav: "Инструменты",
      languageNav: "Язык интерфейса",
      theme: "Светлая или тёмная тема",
      inputLabel: "Домен",
      inputPlaceholder: "example.uz",
      inputHint: "Можно вставить ссылку целиком — 2check возьмёт из неё имя домена.",
      submit: "Проверить",
      submitBusy: "Проверяю…",
      runningHeading: "Выполняется",
      verdictHeading: "Вердикт",
      scoreLabel: "из 100",
      unknownChecks: "не удалось проверить: {count}",
      issuesHeading: "Что стоит исправить",
      severityLabels: {
        critical: "критично",
        warning: "предупреждение",
        informational: "к сведению",
      },
      statusWords: {
        PASS: "пройдено",
        FAIL: "проблема",
        UNKNOWN: "не проверено",
        NOT_APPLICABLE: "неприменимо",
      },
      partialCategory: "проверено не полностью",
      technicalHeading: "Технические подробности",
      technicalNote:
        "Ниже — то же самое, но так, как проверки называются внутри 2check. Это нужно, если вы пересылаете результат администратору сайта или хостингу: по идентификатору и коду они сразу поймут, о какой проверке речь.",
      technicalFields: {
        name: "Имя",
        ascii: "ASCII",
        suffix: "Публичный суффикс",
        registrable: "Регистрируемый домен",
      },
      tableHeads: {
        check: "Проверка",
        status: "Статус",
        reason: "Код причины",
        observed: "Когда проверено",
      },
      recheck: "Проверить заново",
      cached: "из кэша",
      cachedAgo: "из кэша, {minutes} мин назад",
      observedAt: "Наблюдение",
      errorTimeout: "Проверка не завершилась за отведённое время.",
      errorNetwork: "Не удалось связаться с сервисом.",
      aboutHeading: "Что проверяется",
      scopeNote: "Эта страница запускает только одну проверку. Все три — на главной.",
      footerNote:
        "2check показывает то, что видно снаружи: ответы публичных резолверов, данные о регистрации и предъявленный сертификат.",
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
    ui: {
      skipToContent: "Skip to content",
      navHome: "Full check",
      aboutNav: "About",
      homeHeading: "Domain check",
      toolsNav: "Tools",
      languageNav: "Interface language",
      theme: "Light or dark theme",
      inputLabel: "Domain",
      inputPlaceholder: "example.uz",
      inputHint: "You can paste a whole link — 2check takes the domain name out of it.",
      submit: "Check",
      submitBusy: "Checking…",
      runningHeading: "Running",
      verdictHeading: "Verdict",
      scoreLabel: "out of 100",
      unknownChecks: "could not be checked: {count}",
      issuesHeading: "What to fix",
      severityLabels: {
        critical: "critical",
        warning: "warning",
        informational: "for information",
      },
      statusWords: {
        PASS: "passed",
        FAIL: "problem",
        UNKNOWN: "not checked",
        NOT_APPLICABLE: "not applicable",
      },
      partialCategory: "not checked in full",
      technicalHeading: "Technical details",
      technicalNote:
        "The same results under the names 2check uses internally. Useful when you forward the result to a site administrator or a hosting provider: the identifier and the code tell them exactly which check is meant.",
      technicalFields: {
        name: "Name",
        ascii: "ASCII",
        suffix: "Public suffix",
        registrable: "Registrable domain",
      },
      tableHeads: {
        check: "Check",
        status: "Status",
        reason: "Reason code",
        observed: "Checked at",
      },
      recheck: "Check again",
      cached: "from cache",
      cachedAgo: "from cache, {minutes} min ago",
      observedAt: "Observed",
      errorTimeout: "The check did not finish in the time allowed.",
      errorNetwork: "Could not reach the service.",
      aboutHeading: "What is checked",
      scopeNote: "This page runs a single check. All three are on the home page.",
      footerNote:
        "2check reports what is visible from outside: the answers of public resolvers, registration data and the certificate that is presented.",
    },
    scanTitle: "Scan result",
    scanMissing: "This scan is unknown or has expired.",
  },
  /**
   * The Uzbek copy was written by Claude at the owner's request and has NOT been reviewed by a
   * native speaker — the same caveat CATALOGUE_REVIEW records for the message catalogue.
   * Until it is read by a person, treat the wording as provisional.
   */
  uz: {
    tagline: "Domenning texnik holatini oddiy til bilan tekshirish.",
    homeTitle: "2check.uz — domen holatini tekshirish",
    homeDescription:
      "DNS, domen ro'yxatdan o'tishi va SSL/TLS sertifikatini tekshirish — natija tushunarli tilda izohlanadi.",
    toolTitles: {
      dns: "DNS tekshiruvi",
      whois: "Domen ro'yxatdan o'tishini tekshirish",
      ssl: "SSL/TLS sertifikatini tekshirish",
    },
    toolDescriptions: {
      dns: "To'rtta ommaviy rezolver javobini solishtirish: nom mavjudligi, yozuvlar va nomuvofiqliklar.",
      whois:
        ".uz zonasidagi ro'yxatdan o'tish ma'lumotlari RDAP orqali, zaxira sifatida WHOIS so'rovi.",
      ssl: "Sertifikat muddati, host nomiga mosligi va zanjir ishonchi — IPv4 va IPv6 manzillari bo'yicha.",
    },
    toolBody: {
      dns: [
        "2check A, AAAA, MX, TXT, NS, CNAME va SOA yozuvlarini to'rtta ommaviy rezolverdan — Google, Cloudflare, Yandex Basic va Quad9 — so'raydi va ularning javoblarini o'zaro solishtiradi.",
        "Bu rezolverlarni solishtirish, turli mamlakatlardan tekshirish emas: barcha so'rovlar bitta joydan yuboriladi. Geografik taqsimlangan tekshiruv bu versiyaga kirmaydi.",
        "Nom umuman yo'q holati bilan nom bor, ammo shu turdagi yozuv yo'q holati alohida ajratiladi.",
      ],
      whois: [
        "Ro'yxatdan o'tish ma'lumotlari RDAP orqali so'raladi, aniq javob bo'lmasa — zaxira WHOIS so'rovi bilan.",
        ".uz zonasi qo'llab-quvvatlanadi. Boshqa zonadagi domenlarning ro'yxatdan o'tishini 2check tekshirmaydi va taxmin qilish o'rniga buni ochiq aytadi.",
        "Ro'yxatdan o'tuvchining haqiqiy aloqa ma'lumotlari natijaga tushmaydi: faqat maydon to'ldirilgani, yashirilgani yoki mavjud emasligi ko'rsatiladi.",
      ],
      ssl: [
        "2check har bir oila — IPv4 va IPv6 — bo'yicha bitta vakil manzilning 443-portiga ulanadi va taqdim etilgan sertifikatni tahlil qiladi.",
        "Amal qilish muddati, SAN bo'yicha host nomiga mosligi va zanjir ishonchi tekshiriladi. Shifrlar to'plamini baholash, HSTS, OCSP va HTTP tekshiruvlari bu versiyaga kirmaydi.",
        "Sahifa mazmuni yuklanmaydi: faqat TLS qo'l siqishi bajariladi.",
      ],
    },
    scanTitle: "Tekshiruv natijasi",
    scanMissing: "Bunday tekshiruv topilmadi yoki uning saqlash muddati tugagan.",
    ui: {
      skipToContent: "Mazmunga o'tish",
      navHome: "To'liq tekshiruv",
      aboutNav: "Loyiha haqida",
      homeHeading: "Domen tekshiruvi",
      toolsNav: "Vositalar",
      languageNav: "Interfeys tili",
      theme: "Yorug' yoki qorong'i mavzu",
      inputLabel: "Domen",
      inputPlaceholder: "example.uz",
      inputHint: "To'liq havolani ham qo'yish mumkin — 2check undan domen nomini ajratib oladi.",
      submit: "Tekshirish",
      submitBusy: "Tekshirilmoqda…",
      runningHeading: "Bajarilmoqda",
      verdictHeading: "Xulosa",
      scoreLabel: "100 dan",
      unknownChecks: "tekshirib bo'lmadi: {count}",
      issuesHeading: "Nimani tuzatish kerak",
      severityLabels: {
        critical: "jiddiy",
        warning: "ogohlantirish",
        informational: "ma'lumot uchun",
      },
      statusWords: {
        PASS: "o'tdi",
        FAIL: "muammo",
        UNKNOWN: "tekshirilmadi",
        NOT_APPLICABLE: "tegishli emas",
      },
      partialCategory: "to'liq tekshirilmadi",
      technicalHeading: "Texnik tafsilotlar",
      technicalNote:
        "Xuddi shu natijalar, lekin 2check ichida ishlatiladigan nomlar bilan. Natijani sayt ma'muriga yoki hosting provayderiga yuborsangiz, identifikator va kod bo'yicha ular qaysi tekshiruv haqida ekanini darhol tushunadi.",
      technicalFields: {
        name: "Nom",
        ascii: "ASCII",
        suffix: "Ommaviy suffiks",
        registrable: "Ro'yxatga olinadigan domen",
      },
      tableHeads: {
        check: "Tekshiruv",
        status: "Holat",
        reason: "Sabab kodi",
        observed: "Qachon tekshirildi",
      },
      recheck: "Qayta tekshirish",
      cached: "keshdan",
      cachedAgo: "keshdan, {minutes} daqiqa oldin",
      observedAt: "Kuzatuv",
      errorTimeout: "Tekshiruv berilgan vaqt ichida tugamadi.",
      errorNetwork: "Xizmat bilan bog'lanib bo'lmadi.",
      aboutHeading: "Nima tekshiriladi",
      scopeNote: "Bu sahifa faqat bitta tekshiruvni ishga tushiradi. Uchalasi bosh sahifada.",
      footerNote:
        "2check tashqaridan ko'rinadigan narsani ko'rsatadi: ommaviy rezolverlar javobi, ro'yxatdan o'tish ma'lumotlari va taqdim etilgan sertifikat.",
    },
  },
};

/** PRD 24.1 — the pages that may be indexed. Scan routes are never among them. */
export const INDEXABLE_PATHS = ["", "/dns-check", "/whois", "/ssl-check"] as const;

/** PRD 24.3 — each language page is its own canonical and links to the others by hreflang. */
export function alternates(path: string) {
  const languages: Record<string, string> = {
    ru: `${SITE_ORIGIN}/ru${path}`,
    uz: `${SITE_ORIGIN}/uz${path}`,
    en: `${SITE_ORIGIN}/en${path}`,
  };
  /**
   * PRD 24.1 — "/" may be the neutral entry point and the x-default target, and it is the only
   * locale-less route that exists. A tool page has no locale-less URL, so naming one as x-default
   * would publish an hreflang pointing at a 404; those pages simply carry no x-default.
   */
  if (path === "") {
    languages["x-default"] = `${SITE_ORIGIN}/`;
  }
  return { canonical: `${SITE_ORIGIN}/ru${path}`, languages };
}

export function localeAlternates(locale: Locale, path: string) {
  return { ...alternates(path), canonical: `${SITE_ORIGIN}/${locale}${path}` };
}

/** The same page in another language: only the locale segment changes. */
export function switchLocale(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

/** PRD 24.1 — the label each locale is offered under, written in that locale. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  ru: "Рус",
  uz: "O'zb",
  en: "Eng",
};

/** The cookie a reader's explicit language choice is remembered in. */
export const LOCALE_COOKIE = "2check-locale";

/**
 * PRD 24.1 — "/" is a neutral entry point, so it has to decide which language to serve.
 *
 * An explicit choice made with the language control wins over everything. Otherwise the browser's
 * Accept-Language decides, by quality value, matching on the primary subtag so that uz-Cyrl-UZ
 * and uz-Latn both count as Uzbek. Russian is the fallback when nothing matches, including for a
 * crawler, which usually sends no Accept-Language at all.
 */
export function negotiateLocale(acceptLanguage: string | null, chosen?: string | null): Locale {
  if (chosen !== undefined && chosen !== null && isLocale(chosen)) {
    return chosen;
  }
  if (acceptLanguage === null || acceptLanguage.trim() === "") {
    return "ru";
  }

  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag = "", ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => /^\s*q\s*=\s*([\d.]+)\s*$/.exec(parameter))
        .find((match) => match !== null);
      const weight = quality === undefined ? 1 : Number.parseFloat(quality[1] ?? "1");
      return {
        primary: tag.trim().toLowerCase().split("-")[0] ?? "",
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter((entry) => entry.weight > 0 && entry.primary !== "")
    // A stable order: quality first, then the order the browser listed them in.
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const entry of ranked) {
    if (entry.primary === "*") {
      return "ru";
    }
    if (isLocale(entry.primary)) {
      return entry.primary;
    }
  }
  return "ru";
}
