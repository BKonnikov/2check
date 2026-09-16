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
  readonly scansCompleted: string;
  readonly scans30: string;
  readonly scans24: string;
  readonly sessions: string;
  readonly returning: string;
  readonly views: string;
  readonly chartHeading: string;
  readonly chartEmpty: string;
  readonly verdictsHeading: string;
  readonly toolsHeading: string;
  readonly toolsNote: string;
  readonly devicesHeading: string;
  readonly browsersHeading: string;
  readonly typical: string;
  readonly seconds: string;
  readonly audienceHeading: string;
  readonly privacyHeading: string;
  readonly privacy: readonly string[];
  readonly generatedAt: string;
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
    scansTotal: "Проверок всего",
    scansCompleted: "Из них завершено",
    scans30: "За 30 дней",
    scans24: "За сутки",
    sessions: "Сессий за 30 дней",
    returning: "Из них вернувшихся",
    views: "Открытий формы",
    chartHeading: "Проверки по дням",
    chartEmpty: "За последние 30 дней проверок не было.",
    verdictsHeading: "Вердикты полных проверок",
    toolsHeading: "Откуда запускали",
    toolsNote: "Названия ведут на сами инструменты.",
    devicesHeading: "С чего заходят",
    browsersHeading: "Браузеры",
    typical: "Обычная проверка",
    seconds: "сек.",
    audienceHeading: "Посещаемость",
    privacyHeading: "Что здесь не считается",
    privacy: [
      "На этой странице только суммы. Ни один показатель не относится к конкретному домену и ни один — к конкретному человеку.",
      "Проверенные домены не публикуются и не попадают в аналитику: ни списком, ни рейтингом, ни разбивкой по зонам. Что вы проверяли — ваше дело.",
      "Сессия — это случайный идентификатор, который живёт во вкладке браузера. Он не привязан к учётной записи, не хранит IP-адрес и не переходит на другие сервисы.",
      "Строка User-Agent не сохраняется. Из неё на лету определяется только класс клиента — телефон или компьютер, семейство браузера — и записывается уже он: «мобильный Chrome» верно для трети интернета и никого не выделяет, а сама строка — это отпечаток.",
      "Числа обновляются раз в несколько минут, поэтому проверка, сделанную только что, может появиться здесь не сразу.",
    ],
    generatedAt: "Данные на",
    unavailable: "Статистика сейчас недоступна. Сами проверки это не затрагивает.",
    toolNames: {
      home: "Полная проверка",
      dns: "DNS",
      registry: "Домен",
      tls: "SSL/TLS",
      custom: "Своя выборка категорий",
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
    scansTotal: "Scans in total",
    scansCompleted: "Of those, completed",
    scans30: "Last 30 days",
    scans24: "Last 24 hours",
    sessions: "Sessions in 30 days",
    returning: "Of those, returning",
    views: "Form views",
    chartHeading: "Scans per day",
    chartEmpty: "No scans in the last 30 days.",
    verdictsHeading: "Verdicts of full scans",
    toolsHeading: "Where scans were started",
    toolsNote: "The names link to the tools themselves.",
    devicesHeading: "What people arrive on",
    browsersHeading: "Browsers",
    typical: "A scan usually takes",
    seconds: "s",
    audienceHeading: "Audience",
    privacyHeading: "What is not counted here",
    privacy: [
      "This page holds totals only. No figure on it belongs to one domain, and none belongs to one person.",
      "The domains people check are neither published nor sent to analytics — no list, no ranking, no breakdown by zone. What you checked is your business.",
      "A session is a random identifier that lives in a browser tab. It is not an account, it holds no IP address, and it does not travel to other services.",
      'The User-Agent string is not stored. Only a coarse class is read from it as the event arrives — phone or desktop, browser family — and that is what is kept: "mobile Chrome" is true of a third of the internet and singles nobody out, whereas the string itself is a fingerprint.',
      "The figures refresh every few minutes, so a scan run just now may take a moment to appear.",
    ],
    generatedAt: "Figures as of",
    unavailable: "Statistics are unavailable right now. Scans themselves are unaffected.",
    toolNames: {
      home: "Full check",
      dns: "DNS",
      registry: "Domain",
      tls: "SSL/TLS",
      custom: "A chosen set of categories",
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
    scansTotal: "Jami tekshiruvlar",
    scansCompleted: "Shundan yakunlangani",
    scans30: "30 kun ichida",
    scans24: "Sutka ichida",
    sessions: "30 kundagi sessiyalar",
    returning: "Shundan qaytganlari",
    views: "Forma ochilishi",
    chartHeading: "Kunlar bo'yicha tekshiruvlar",
    chartEmpty: "Oxirgi 30 kunda tekshiruv bo'lmadi.",
    verdictsHeading: "To'liq tekshiruvlar hukmi",
    toolsHeading: "Qayerdan boshlangan",
    toolsNote: "Nomlar asboblarning o'ziga olib boradi.",
    devicesHeading: "Nima bilan kirishadi",
    browsersHeading: "Brauzerlar",
    typical: "Odatdagi tekshiruv",
    seconds: "s",
    audienceHeading: "Tashrif",
    privacyHeading: "Bu yerda nima hisoblanmaydi",
    privacy: [
      "Bu sahifada faqat yig'indilar. Birorta ko'rsatkich aniq bir domenga ham, aniq bir odamga ham tegishli emas.",
      "Tekshirilgan domenlar e'lon qilinmaydi va tahlilga tushmaydi: ro'yxat ham, reyting ham, zonalar bo'yicha taqsimot ham yo'q. Nimani tekshirganingiz — sizning ishingiz.",
      "Sessiya — brauzer ichida yashaydigan tasodifiy identifikator. U hisob yozuvi emas, IP manzilni saqlamaydi va boshqa xizmatlarga o'tmaydi.",
      "User-Agent satri saqlanmaydi. Undan faqat mijozning qo'pol sinfi — telefonmi yoki kompyuter, brauzer oilasi — o'qiladi va o'sha yoziladi: «mobil Chrome» internetning uchdan biri uchun to'g'ri va hech kimni ajratmaydi, satrning o'zi esa barmoq izi.",
      "Raqamlar bir necha daqiqada bir yangilanadi, shuning uchun hozir bajarilgan tekshiruv bu yerda darhol ko'rinmasligi mumkin.",
    ],
    generatedAt: "Ma'lumot holati",
    unavailable: "Statistika hozir mavjud emas. Bu tekshiruvlarga ta'sir qilmaydi.",
    toolNames: {
      home: "To'liq tekshiruv",
      dns: "DNS",
      registry: "Domen",
      tls: "SSL/TLS",
      custom: "Tanlangan toifalar",
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
  readonly scans: {
    readonly total: number;
    readonly completed: number;
    readonly last30Days: number;
    readonly last24Hours: number;
  };
  readonly verdicts: Readonly<Record<string, number>>;
  readonly tools: Readonly<Record<string, number>>;
  readonly byDay: readonly { readonly day: string; readonly scans: number }[];
  readonly typicalSeconds: number | null;
  readonly audience: {
    readonly sessions: number;
    readonly returningSessions: number;
    readonly views: number;
    readonly devices: readonly { readonly key: string; readonly sessions: number }[];
    readonly browsers: readonly { readonly key: string; readonly sessions: number }[];
  };
}
