import type { Locale } from "./chrome";

/**
 * PRD 28 — the copy of the published statistics page.
 *
 * The page exists to answer "is anyone using this?", and it answers with counts of the service's
 * own work. It deliberately does not answer "what are people checking?": which domains readers
 * looked at is their business, so no domain, no zone breakdown and nothing per reader is counted
 * or shown. The note at the foot says so in as many words, because a statistics page that does
 * not say what it does not collect is asking to be assumed the worst of.
 */
export interface StatsCopy {
  readonly title: string;
  readonly description: string;
  readonly nav: string;
  readonly scansTotal: string;
  readonly sessions: string;
  readonly returning: string;
  readonly verdictsHeading: string;
  /** The three groups the verdicts are collapsed into on this page. */
  readonly verdictGroups: Readonly<Record<"clean" | "notes" | "problems", string>>;
  readonly toolsHeading: string;
  readonly devicesHeading: string;
  readonly browsersHeading: string;
  readonly audienceHeading: string;
  readonly privacyHeading: string;
  readonly privacy: readonly string[];
  readonly generatedAt: string;
  readonly generatedNote: string;
  readonly unavailable: string;
  readonly toolNames: Readonly<Record<string, string>>;
  readonly deviceNames: Readonly<Record<string, string>>;
  /** What an unrecognised browser family is called. */
  readonly otherBrowser: string;
  readonly window30: string;
}

export const STATS: Readonly<Record<Locale, StatsCopy>> = {
  ru: {
    title: "Статистика 2check",
    description: "Сколько проверок сделал сервис и как его читают. Только суммы, без доменов.",
    nav: "Статистика",
    scansTotal: "проверок сделано",
    sessions: "Всего заходов",
    returning: "Из них повторных",
    verdictsHeading: "Что нашли у доменов",
    verdictGroups: {
      clean: "Всё в порядке",
      notes: "Можно улучшить",
      problems: "Есть поломки",
    },
    toolsHeading: "Что проверяли",
    devicesHeading: "С чего заходили",
    browsersHeading: "В каком браузере",
    audienceHeading: "Посещаемость",
    privacyHeading: "Что здесь не считается",
    privacy: [
      "На этой странице только суммы. Ни один показатель не относится к конкретному домену и ни один — к конкретному человеку.",
      "Проверенные домены не публикуются и не попадают в аналитику: ни списком, ни рейтингом, ни разбивкой по зонам. Что вы проверяли — ваше дело.",
      "Сессия — случайный идентификатор, который живёт во вкладке браузера: не учётная запись, без IP-адреса, не переходит на другие сервисы. Строка User-Agent не сохраняется — из неё на лету берётся только класс клиента вроде «мобильный Chrome», который верен для трети интернета и никого не выделяет.",
    ],
    generatedAt: "Данные на",
    generatedNote: "обновляются раз в несколько минут",
    unavailable: "Статистика сейчас недоступна. Сами проверки это не затрагивает.",
    toolNames: {
      home: "Домен целиком",
      dns: "Только DNS",
      registry: "Только регистрацию домена",
      tls: "Только сертификат SSL/TLS",
    },
    deviceNames: {
      desktop: "Компьютер",
      mobile: "Телефон",
      tablet: "Планшет",
      bot: "Роботы и краулеры",
      unknown: "Не определилось",
    },
    otherBrowser: "Прочие",
    window30: "за 30 дней",
  },
  en: {
    title: "2check statistics",
    description: "How much the service has been used, and how it is read. Totals only, no domains.",
    nav: "Statistics",
    scansTotal: "checks done",
    sessions: "Visits in total",
    returning: "Of those, repeat visits",
    verdictsHeading: "What the domains turned out like",
    verdictGroups: {
      clean: "All fine",
      notes: "Room for improvement",
      problems: "Something broken",
    },
    toolsHeading: "What people checked",
    devicesHeading: "What they arrived on",
    browsersHeading: "Which browser",
    audienceHeading: "Visits",
    privacyHeading: "What is not counted here",
    privacy: [
      "This page holds totals only. No figure on it belongs to one domain, and none belongs to one person.",
      "The domains people check are neither published nor sent to analytics — no list, no ranking, no breakdown by zone. What you checked is your business.",
      'A session is a random identifier living in a browser tab: not an account, no IP address, and it never travels to another service. The User-Agent string is not stored — only a coarse class such as "mobile Chrome" is read from it, which is true of a third of the internet and singles nobody out.',
    ],
    generatedAt: "Figures as of",
    generatedNote: "refreshed every few minutes",
    unavailable: "Statistics are unavailable right now. Scans themselves are unaffected.",
    toolNames: {
      home: "The whole domain",
      dns: "DNS only",
      registry: "Domain registration only",
      tls: "SSL/TLS certificate only",
    },
    deviceNames: {
      desktop: "Desktop",
      mobile: "Phone",
      tablet: "Tablet",
      bot: "Bots and crawlers",
      unknown: "Undetermined",
    },
    otherBrowser: "Other",
    window30: "over 30 days",
  },
  uz: {
    title: "2check statistikasi",
    description:
      "Xizmat qancha tekshiruv bajargani va uni qanday o'qishlari. Faqat yig'indilar, domensiz.",
    nav: "Statistika",
    scansTotal: "tekshiruv bajarilgan",
    sessions: "Jami tashriflar",
    returning: "Shundan takroriylari",
    verdictsHeading: "Domenlar qanday chiqdi",
    verdictGroups: {
      clean: "Hammasi joyida",
      notes: "Yaxshilash mumkin",
      problems: "Buzilgan joyi bor",
    },
    toolsHeading: "Nimani tekshirishgan",
    devicesHeading: "Nima bilan kirishgan",
    browsersHeading: "Qaysi brauzerda",
    audienceHeading: "Tashriflar",
    privacyHeading: "Bu yerda nima hisoblanmaydi",
    privacy: [
      "Bu sahifada faqat yig'indilar. Birorta ko'rsatkich aniq bir domenga ham, aniq bir odamga ham tegishli emas.",
      "Tekshirilgan domenlar e'lon qilinmaydi va tahlilga tushmaydi: ro'yxat ham, reyting ham, zonalar bo'yicha taqsimot ham yo'q. Nimani tekshirganingiz — sizning ishingiz.",
      "Sessiya — brauzer ichida yashaydigan tasodifiy identifikator: hisob yozuvi emas, IP manzilsiz, boshqa xizmatlarga o'tmaydi. User-Agent satri saqlanmaydi — undan faqat «mobil Chrome» kabi qo'pol sinf olinadi, u internetning uchdan biri uchun to'g'ri va hech kimni ajratmaydi.",
    ],
    generatedAt: "Ma'lumot holati",
    generatedNote: "bir necha daqiqada bir yangilanadi",
    unavailable: "Statistika hozir mavjud emas. Bu tekshiruvlarga ta'sir qilmaydi.",
    toolNames: {
      home: "Domenni butunlay",
      dns: "Faqat DNS",
      registry: "Faqat domen ro'yxatini",
      tls: "Faqat SSL/TLS sertifikatini",
    },
    deviceNames: {
      desktop: "Kompyuter",
      mobile: "Telefon",
      tablet: "Planshet",
      bot: "Robot va krauler",
      unknown: "Aniqlanmadi",
    },
    otherBrowser: "Boshqalar",
    window30: "30 kun ichida",
  },
};

/** The shape the API publishes at /stats; the page and the view both read it. */
export interface PublicStats {
  readonly generatedAt: string;
  readonly scansTotal: number;
  readonly verdicts: Readonly<Record<string, number>>;
  readonly tools: Readonly<Record<string, number>>;
  readonly audience: {
    readonly sessions: number;
    readonly returningSessions: number;
    readonly devices: readonly { readonly key: string; readonly sessions: number }[];
    readonly browsers: readonly { readonly key: string; readonly sessions: number }[];
  };
}
