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
  readonly technicalLoading: string;
  readonly technicalError: string;
  readonly yes: string;
  readonly no: string;
  readonly none: string;
  /** PRD 6.5 — the values stay machine-readable; only the field names are translated. */
  readonly detailLabels: Readonly<Record<string, string>>;
  /** A sentence under a technical row, for the rows whose label is not self-explanatory. */
  readonly detailHints: Readonly<Record<string, string>>;
  /** Stands in for the resolver names when every resolver answered the same. */
  readonly allResolvers: string;
  readonly serviceKinds: Readonly<Record<"mail" | "sender" | "verification", string>>;
  readonly technicalFields: Readonly<Record<"name" | "ascii" | "suffix" | "registrable", string>>;
  readonly tableHeads: Readonly<Record<"check" | "status" | "reason" | "observed", string>>;
  readonly share: string;
  readonly shareCopy: string;
  readonly shareSave: string;
  readonly shareCopied: string;
  readonly shareFailed: string;
  readonly shareFooter: string;
  readonly shareCheckedAt: string;
  readonly shareChecksLabel: string;
  /** Carries a {count} placeholder. */
  readonly shareMoreChecks: string;
  readonly sharePartial: string;
  readonly shareNote: string;
  readonly recheck: string;
  readonly recheckNote: string;
  readonly cachedResults: string;
  readonly deadlineNote: string;
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
      technicalLoading: "Загружаю…",
      technicalError: "Не удалось загрузить технические подробности.",
      yes: "да",
      no: "нет",
      none: "—",
      detailLabels: {
        qname: "Запрошенное имя",
        qtype: "Тип записи",
        hostname: "Имя хоста",
        port: "Порт",
        ipFamily: "Семейство адресов",
        registryDomain: "Домен в реестре",
        registryProvider: "Источник",
        transportsUsed: "Использованные протоколы",
        resolverSetVersion: "Версия набора резолверов",
        providers: "Резолверы",
        state: "Состояние записи",
        providerStates: "Состояние по резолверам",
        answersByProvider: "Ответы резолверов",
        recognisedServices: "Распознанные сервисы",
        valueVariation: "Значения расходятся",
        registrar: "Регистратор",
        createdAt: "Зарегистрирован",
        updatedAt: "Запись изменена",
        expiresAt: "Действует до",
        nameServers: "Серверы имён",
        status: "Статус регистрации",
        rawStatus: "Статус словами реестра",
        registrant: "Поля владельца",
        name: "Имя",
        email: "Почта",
        phone: "Телефон",
        address: "Адрес",
        protocol: "Версия TLS",
        failureCode: "Код сбоя",
        evaluatedFamilies: "Проверенные семейства",
        daysRemaining: "Осталось дней",
        validFrom: "Действителен с",
        validTo: "Действителен до",
        issuer: "Кем выпущен",
        subjectAltNames: "Имена в сертификате",
        fingerprints: "Отпечатки",
        fingerprintVariation: "Отпечатки различаются",
        chainErrorCode: "Код проверки цепочки",
        endpointCoverage: "Охват точек подключения",
        hostnameChecked: "Проверяемое имя",
        IPV4: "по IPv4",
        IPV6: "по IPv6",
        REPRESENTATIVE: "одна представительная точка",
        value: "указано",
        redacted: "скрыто реестром",
        unavailable: "недоступно",
      },
      detailHints: {
        hostname: "Имя, которое мы отправили серверу в запросе и для которого сверяли сертификат.",
        subjectAltNames:
          "Имена, для которых сертификат действителен. Звёздочка заменяет ровно одну часть имени: *.example.uz покрывает www.example.uz, но не a.b.example.uz и не сам example.uz — поэтому голое имя обычно перечисляют отдельно.",
        issuer:
          "Удостоверяющий центр, который выпустил сертификат, и организация, которой он принадлежит. Браузеры доверяют не сертификату, а этому центру.",
        fingerprints:
          "Короткая свёртка (SHA-256) самого сертификата — его отпечаток. По ней сверяют, что на каждом адресе отдают именно тот сертификат, который вы установили.",
        fingerprintVariation:
          "Если адресов несколько и отпечатки разошлись, значит на разных серверах стоят разные сертификаты. Само по себе это не ошибка, но чаще всего это забытое обновление на одном из них.",
        evaluatedFamilies:
          "Семейства адресов, по которым удалось подключиться и получить сертификат: IPv4, IPv6 или оба.",
        endpointCoverage:
          "Мы подключаемся к одному адресу из каждого семейства, а не ко всем сразу. Для большинства сайтов этого достаточно, но за балансировщиком отдельные серверы могут отвечать иначе.",
        daysRemaining:
          "Сколько дней остаётся у сертификата с самым близким концом срока среди проверенных адресов.",
        chainErrorCode:
          "Код, которым библиотека TLS объяснила отказ. Его стоит переслать администратору сайта как есть.",
        answersByProvider: "Что именно ответил каждый публичный резолвер на наш запрос.",
        valueVariation:
          "Говорит, вернули ли резолверы запись с разными значениями. Само по себе расхождение обычно означает балансировку или ещё не разошедшееся обновление, а не ошибку.",
        providerStates:
          "Как ответил каждый резолвер. В проверке существования имени это сводный голос по всем типам записей сразу, поэтому он может отличаться от состояния конкретной записи ниже.",
        rawStatus: "Статус так, как его словами вернул реестр домена, без нашей трактовки.",
        recognisedServices:
          "Сервисы, на которые указывают эти записи. Записи говорят о маршрутизации и о выданных подтверждениях, а не о том, чем пользуются внутри компании: токен может пережить сервис, который его просил.",
      },
      allResolvers: "все резолверы",
      serviceKinds: {
        mail: "почта",
        sender: "отправка писем",
        verification: "подтверждение домена",
      },
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
      share: "Поделиться",
      shareCopy: "Скопировать картинку",
      shareSave: "Сохранить картинку",
      shareCopied: "Картинка скопирована",
      shareFailed: "Не удалось подготовить картинку",
      shareFooter: "Наблюдение из одной точки в один момент времени",
      shareCheckedAt: "Проверено",
      shareChecksLabel: "проверок пройдено",
      shareMoreChecks: "и ещё {count}",
      sharePartial: "Частичная проверка",
      shareNote: "Уходит только картинка: ни ссылки, ни технических подробностей в ней нет.",
      recheck: "Проверить заново",
      recheckNote: "Запрос уйдёт к резолверам, реестру и серверу заново, мимо кэша.",
      deadlineNote:
        "Проверка не уложилась в отведённое время: часть проверок осталась незавершённой, а не показала проблему.",
      cachedResults:
        "Часть данных взята из кэша — точное время каждой проверки в технических подробностях.",
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
      technicalLoading: "Loading…",
      technicalError: "The technical details could not be loaded.",
      yes: "yes",
      no: "no",
      none: "—",
      detailLabels: {
        qname: "Name queried",
        qtype: "Record type",
        hostname: "Host name",
        port: "Port",
        ipFamily: "Address family",
        registryDomain: "Domain in the registry",
        registryProvider: "Source",
        transportsUsed: "Protocols used",
        resolverSetVersion: "Resolver set version",
        providers: "Resolvers",
        state: "Record state",
        providerStates: "State per resolver",
        answersByProvider: "Answers per resolver",
        recognisedServices: "Services recognised",
        valueVariation: "Values differ",
        registrar: "Registrar",
        createdAt: "Registered",
        updatedAt: "Record last changed",
        expiresAt: "Expires",
        nameServers: "Name servers",
        status: "Registration status",
        rawStatus: "Status in the registry's words",
        registrant: "Registrant fields",
        name: "Name",
        email: "Email",
        phone: "Phone",
        address: "Address",
        protocol: "TLS version",
        failureCode: "Failure code",
        evaluatedFamilies: "Families evaluated",
        daysRemaining: "Days remaining",
        validFrom: "Valid from",
        validTo: "Valid to",
        issuer: "Issued by",
        subjectAltNames: "Names in the certificate",
        fingerprints: "Fingerprints",
        fingerprintVariation: "Fingerprints differ",
        chainErrorCode: "Chain verification code",
        endpointCoverage: "Endpoint coverage",
        hostnameChecked: "Name checked",
        IPV4: "over IPv4",
        IPV6: "over IPv6",
        REPRESENTATIVE: "one representative endpoint",
        value: "present",
        redacted: "redacted by the registry",
        unavailable: "unavailable",
      },
      detailHints: {
        hostname:
          "The name we sent to the server, and the name the certificate was checked against.",
        subjectAltNames:
          "The names this certificate is valid for. An asterisk stands for exactly one label: *.example.uz covers www.example.uz, but neither a.b.example.uz nor example.uz itself — which is why the bare name is usually listed separately.",
        issuer:
          "The authority that issued the certificate, and the organisation behind it. Browsers trust the authority, not the certificate.",
        fingerprints:
          "A short digest (SHA-256) of the certificate itself. Use it to confirm that every address serves the certificate you installed.",
        fingerprintVariation:
          "If there are several addresses and the fingerprints differ, the servers are holding different certificates. That is not a fault in itself, but it is most often a renewal that reached only one of them.",
        evaluatedFamilies:
          "The address families we could connect over and get a certificate from: IPv4, IPv6 or both.",
        endpointCoverage:
          "We connect to one address per family rather than to all of them. That is enough for most sites, though behind a load balancer individual servers can answer differently.",
        daysRemaining:
          "Days left on the certificate that expires soonest among the addresses checked.",
        chainErrorCode:
          "The code the TLS library gave for the refusal. Worth forwarding to the site administrator as it stands.",
        answersByProvider: "What each public resolver actually answered.",
        valueVariation:
          "Says whether the resolvers returned the record with differing values. A difference on its own usually means load balancing or an update still propagating, not a fault.",
        providerStates:
          "How each resolver answered. On the name-existence check this is a combined vote across every record type, so it can differ from the state of the individual record below.",
        rawStatus: "The status in the registry's own words, before we interpret it.",
        recognisedServices:
          "The services these records point at. Records describe routing and issued verifications, not what an organisation uses inside: a token can outlive the service that asked for it.",
      },
      allResolvers: "all resolvers",
      serviceKinds: {
        mail: "mail",
        sender: "sends mail",
        verification: "domain verification",
      },
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
      share: "Share",
      shareCopy: "Copy image",
      shareSave: "Save image",
      shareCopied: "Image copied",
      shareFailed: "The image could not be prepared",
      shareFooter: "One observation, from one location, at one moment",
      shareCheckedAt: "Checked",
      shareChecksLabel: "checks passed",
      shareMoreChecks: "and {count} more",
      sharePartial: "Partial check",
      shareNote: "Only the image travels: it carries no link and no technical detail.",
      recheck: "Check again",
      recheckNote:
        "The resolvers, the registry and the host are queried again, bypassing the cache.",
      deadlineNote:
        "The scan ran out of its time budget: some checks were cut short rather than finding a problem.",
      cachedResults:
        "Some of this came from the cache — the technical details give the exact time of each check.",
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
      technicalLoading: "Yuklanmoqda…",
      technicalError: "Texnik tafsilotlarni yuklab bo'lmadi.",
      yes: "ha",
      no: "yo'q",
      none: "—",
      detailLabels: {
        qname: "So'ralgan nom",
        qtype: "Yozuv turi",
        hostname: "Host nomi",
        port: "Port",
        ipFamily: "Manzil oilasi",
        registryDomain: "Reestrdagi domen",
        registryProvider: "Manba",
        transportsUsed: "Ishlatilgan protokollar",
        resolverSetVersion: "Rezolverlar to'plami versiyasi",
        providers: "Rezolverlar",
        state: "Yozuv holati",
        providerStates: "Rezolverlar bo'yicha holat",
        answersByProvider: "Rezolverlar javoblari",
        recognisedServices: "Aniqlangan xizmatlar",
        valueVariation: "Qiymatlar farq qiladi",
        registrar: "Registrator",
        createdAt: "Ro'yxatdan o'tgan",
        updatedAt: "Yozuv o'zgartirilgan",
        expiresAt: "Amal qilish muddati",
        nameServers: "Nom serverlari",
        status: "Ro'yxatdan o'tish holati",
        rawStatus: "Reestr so'zlari bilan holat",
        registrant: "Egasining maydonlari",
        name: "Nomi",
        email: "Pochta",
        phone: "Telefon",
        address: "Manzil",
        protocol: "TLS versiyasi",
        failureCode: "Nosozlik kodi",
        evaluatedFamilies: "Tekshirilgan oilalar",
        daysRemaining: "Qolgan kunlar",
        validFrom: "Amal qilish boshlanishi",
        validTo: "Amal qilish tugashi",
        issuer: "Kim chiqargan",
        subjectAltNames: "Sertifikatdagi nomlar",
        fingerprints: "Barmoq izlari",
        fingerprintVariation: "Barmoq izlari farq qiladi",
        chainErrorCode: "Zanjir tekshiruvi kodi",
        endpointCoverage: "Ulanish nuqtalari qamrovi",
        hostnameChecked: "Tekshirilgan nom",
        IPV4: "IPv4 orqali",
        IPV6: "IPv6 orqali",
        REPRESENTATIVE: "bitta vakil nuqta",
        value: "ko'rsatilgan",
        redacted: "reestr tomonidan yashirilgan",
        unavailable: "mavjud emas",
      },
      detailHints: {
        hostname: "Serverga so'rovda yuborilgan va sertifikat solishtirilgan nom.",
        subjectAltNames:
          "Sertifikat amal qiladigan nomlar. Yulduzcha nomning aynan bitta qismini almashtiradi: *.example.uz www.example.uz ni qamraydi, lekin a.b.example.uz ni ham, example.uz ning o'zini ham qamramaydi — shuning uchun yalang'och nom odatda alohida yoziladi.",
        issuer:
          "Sertifikatni chiqargan guvohlik markazi va u tegishli tashkilot. Brauzerlar sertifikatga emas, shu markazga ishonadi.",
        fingerprints:
          "Sertifikatning o'zidan olingan qisqa svertka (SHA-256) — uning barmoq izi. Har bir manzilda aynan siz o'rnatgan sertifikat berilayotganini shu bo'yicha tekshiriladi.",
        fingerprintVariation:
          "Manzillar bir nechta bo'lib, barmoq izlari farq qilsa, serverlarda turli sertifikatlar turibdi. Bu o'z-o'zidan xato emas, lekin ko'pincha ulardan birida yangilanish o'tkazib yuborilgan bo'ladi.",
        evaluatedFamilies:
          "Ulanib, sertifikat olishga muvaffaq bo'lgan manzil oilalari: IPv4, IPv6 yoki ikkalasi.",
        endpointCoverage:
          "Biz har bir oiladan bitta manzilga ulanamiz, hammasiga emas. Ko'pchilik saytlar uchun bu yetarli, ammo balansirovchi ortidagi alohida serverlar boshqacha javob berishi mumkin.",
        daysRemaining:
          "Tekshirilgan manzillar orasida muddati eng yaqin tugaydigan sertifikatga qancha kun qolgani.",
        chainErrorCode:
          "TLS kutubxonasi rad etishni tushuntirgan kod. Uni sayt ma'muriga o'zgartirmasdan yuborish foydali.",
        answersByProvider: "Har bir ommaviy rezolver aynan nima javob bergani.",
        valueVariation:
          "Rezolverlar yozuvni har xil qiymat bilan qaytarganini bildiradi. Farqning o'zi odatda balanslash yoki hali tarqalmagan yangilanish degani, xato emas.",
        providerStates:
          "Har bir rezolver qanday javob bergani. Nom mavjudligi tekshiruvida bu barcha yozuv turlari bo'yicha umumiy ovoz, shuning uchun quyidagi alohida yozuv holatidan farq qilishi mumkin.",
        rawStatus: "Holat reestrning o'z so'zlari bilan, biz talqin qilmasdan.",
        recognisedServices:
          "Bu yozuvlar ishora qilayotgan xizmatlar. Yozuvlar marshrutlash va berilgan tasdiqlar haqida gapiradi, kompaniya ichida nimadan foydalanishi haqida emas: token uni so'ragan xizmatdan uzoqroq yashashi mumkin.",
      },
      allResolvers: "barcha rezolverlar",
      serviceKinds: {
        mail: "pochta",
        sender: "xat yuborish",
        verification: "domen tasdig'i",
      },
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
      share: "Ulashish",
      shareCopy: "Rasmni nusxalash",
      shareSave: "Rasmni saqlash",
      shareCopied: "Rasm nusxalandi",
      shareFailed: "Rasmni tayyorlab bo'lmadi",
      shareFooter: "Bitta joydan, bitta vaqtda qilingan kuzatuv",
      shareCheckedAt: "Tekshirilgan",
      shareChecksLabel: "tekshiruv o'tdi",
      shareMoreChecks: "va yana {count}",
      sharePartial: "Qisman tekshiruv",
      shareNote: "Faqat rasm yuboriladi: unda havola ham, texnik tafsilot ham yo'q.",
      recheck: "Qayta tekshirish",
      recheckNote: "So'rov rezolverlar, reestr va serverga keshdan o'tmasdan qaytadan yuboriladi.",
      deadlineNote:
        "Tekshiruv ajratilgan vaqtga sig'madi: ba'zi tekshiruvlar muammo topgani uchun emas, tugamagani uchun yakunlanmadi.",
      cachedResults:
        "Ma'lumotlarning bir qismi keshdan olingan — har bir tekshiruvning aniq vaqti texnik tafsilotlarda.",
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
