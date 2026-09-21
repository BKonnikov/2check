import type { Locale } from "./chrome";

/**
 * The colophon: what the product is for, who made it, what it was made with, where its data
 * comes from, and under what terms the things it depends on are used.
 *
 * It is deliberately plain text rather than a rendered legal template. Everything here is a
 * statement of fact about this deployment; if a fact changes, the text changes with it.
 */
export interface AboutSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface About {
  readonly title: string;
  readonly description: string;
  readonly sections: readonly AboutSection[];
  readonly noticesHeading: string;
  readonly noticesIntro: string;
  readonly licenceColumn: string;
  readonly updated: string;
}

/**
 * Third-party components this product is built from, with the licence each is published under.
 * Names, licences and links are facts, so they are not translated.
 */
export const NOTICES: readonly {
  readonly name: string;
  readonly licence: string;
  readonly href: string;
}[] = [
  {
    name: "Public Suffix List (Mozilla Foundation)",
    licence: "MPL 2.0",
    href: "https://publicsuffix.org/",
  },
  { name: "parse-domain", licence: "MIT", href: "https://github.com/peerigon/parse-domain" },
  { name: "tr46", licence: "MIT", href: "https://github.com/jsdom/tr46" },
  { name: "ipaddr.js", licence: "MIT", href: "https://github.com/whitequark/ipaddr.js" },
  { name: "Fastify", licence: "MIT", href: "https://fastify.dev/" },
  { name: "Next.js", licence: "MIT", href: "https://nextjs.org/" },
  { name: "React", licence: "MIT", href: "https://react.dev/" },
  { name: "node-postgres (pg)", licence: "MIT", href: "https://node-postgres.com/" },
  { name: "ioredis", licence: "MIT", href: "https://github.com/redis/ioredis" },
  { name: "Zod", licence: "MIT", href: "https://zod.dev/" },
];

export const ABOUT: Readonly<Record<Locale, About>> = {
  ru: {
    title: "О проекте",
    description:
      "Назначение 2check, автор, использованные инструменты, источники данных и лицензии.",
    updated: "Обновлено 15 сентября 2026 года.",
    noticesHeading: "Компоненты и лицензии",
    noticesIntro:
      "2check собран из открытых компонентов. Ниже — те из них, что участвуют в самой проверке или в работе сайта, и лицензии, под которыми они опубликованы.",
    licenceColumn: "Лицензия",
    sections: [
      {
        heading: "Зачем этот сайт",
        paragraphs: [
          "2check — некоммерческий проект, сделанный в ознакомительных и образовательных целях. Он показывает то, что видно о домене снаружи: ответы публичных резолверов DNS, данные о регистрации из реестра зоны и сертификат, который сервер предъявляет при TLS-рукопожатии.",
          "Результат — наблюдение из одной точки в один момент времени. Это не аудит безопасности, не юридическое заключение и не гарантия. Он может устареть, разойтись с тем, что видят другие резолверы, или оказаться неполным, если внешний источник не ответил. Решения, у которых есть последствия, принимайте по данным вашего регистратора, хостинга и удостоверяющего центра.",
          "Сервис предоставляется «как есть», без каких-либо явных или подразумеваемых гарантий. Автор не отвечает за убытки, возникшие из-за использования сервиса или доверия к его результатам.",
          "Пожалуйста, не используйте 2check для массовых автоматических проверок: он работает на одном сервере и обращается к чужим публичным сервисам.",
        ],
      },
      {
        heading: "Кто его сделал",
        paragraphs: [
          "Проект сделан одним автором. Ему принадлежат замысел, продуктовые решения и, что важнее всего для такого сервиса, границы: что 2check обещает, а чего сознательно не делает.",
          "Это независимый личный проект. Он не связан ни с одним регистратором, хостинг-провайдером, удостоверяющим центром или государственным органом, не выступает от их имени и ничего не продаёт.",
        ],
      },
      {
        heading: "Как он сделан",
        paragraphs: [
          "Сначала спецификация, потом код. Прежде чем была написана первая строка, автор описал продукт целиком: 28 разделов и 218 критериев приёмки, от правил разбора доменного имени до того, какими словами сервису позволено говорить о чужом домене. Каждое поведение, которое вы видите на экране, отвечает конкретному пункту этого документа.",
          "Реализация написана по этой спецификации с помощью инструментов искусственного интеллекта — ChatGPT (OpenAI) и Claude (Anthropic). Так делается всё больше современного софта, и здесь об этом сказано прямо, а не умолчено. Постановка задач, архитектурные решения, приёмка каждого изменения и ответственность за результат остаются за автором.",
          "ChatGPT и OpenAI — товарные знаки OpenAI, Claude и Anthropic — товарные знаки Anthropic. Названия указаны, чтобы честно назвать использованные инструменты. Проект не связан с этими компаниями, не поддерживается и не одобрен ими.",
        ],
      },
      {
        heading: "Откуда берутся данные",
        paragraphs: [
          "Записи DNS запрашиваются у четырёх публичных резолверов: Google Public DNS (8.8.8.8), Cloudflare (1.1.1.1), Yandex Basic (77.88.8.8) и Quad9 без фильтрации (9.9.9.10). Все запросы уходят с одной площадки: это сравнение резолверов, а не проверка из разных стран.",
          "Данные о регистрации доменов в зоне .uz запрашиваются у реестра .uz по RDAP, а если определённого ответа нет — резервным запросом WHOIS. Сертификат читается напрямую с проверяемого узла по порту 443; содержимое страниц при этом не загружается.",
          "Названия и товарные знаки этих сервисов принадлежат их владельцам. 2check с ними не связан и не выступает от их имени.",
        ],
      },
      {
        heading: "Что сохраняется",
        paragraphs: [
          "В базе сохраняются каноническое доменное имя и результат проверки. Строка, которую вы ввели, до сохранения отбрасывается. Контактные данные владельца домена в результат не попадают: видно только, заполнено поле, скрыто реестром или недоступно.",
          "Сторонняя аналитика и рекламные сети на сайте не подключены — и не могут быть: политика безопасности содержимого разрешает скрипты только с этого адреса. Посещаемость 2check считает сам: записываются обезличенные события вида «открыли форму», «запустили проверку», «посмотрели результат», «открыли технические подробности», с указанием языка, страницы и режима проверки.",
          "В этих записях нет ни проверяемого домена, ни идентификатора проверки, ни введённой строки, ни IP-адреса, ни данных о владельце домена. Чтобы связать шаги одного визита, используется случайный номер, который живёт только до закрытия вкладки и ни с чем больше не связан.",
          "В подвале сайта показан ваш собственный публичный адрес — он бывает нужен, когда разбираешься, почему сайт не открывается. Его определяет само веб-приложение и возвращает вам же: в аналитику он не попадает, в журналы не пишется и нигде не хранится. Сервис, который выполняет проверки и ведёт записи, вашего адреса вообще не видит — браузер обращается к нему не напрямую.",
          "В браузере сохраняются выбранный язык, выбранная тема оформления и отметка о том, что вы здесь уже были.",
        ],
      },
    ],
  },
  en: {
    title: "About",
    description:
      "What 2check is for, who made it, what it was made with, its data sources and licences.",
    updated: "Updated 15 September 2026.",
    noticesHeading: "Components and licences",
    noticesIntro:
      "2check is assembled from open-source components. These are the ones that take part in the checks themselves or in serving the site, with the licence each is published under.",
    licenceColumn: "Licence",
    sections: [
      {
        heading: "What this site is for",
        paragraphs: [
          "2check is a non-commercial project, made for information and for learning. It reports what is visible about a domain from outside: the answers of public DNS resolvers, registration data from the zone's registry, and the certificate the server presents during the TLS handshake.",
          "A result is an observation from one location at one moment. It is not a security audit, not legal advice and not a guarantee. It can go stale, disagree with what other resolvers see, or be incomplete when an external source does not answer. Decisions with consequences belong with the data held by your registrar, your host and your certificate authority.",
          "The service is provided as is, without warranty of any kind, express or implied. The author is not liable for any loss arising from using the service or relying on its results.",
          "Please do not use 2check for bulk automated scanning: it runs on a single server and queries other people's public services.",
        ],
      },
      {
        heading: "Who made it",
        paragraphs: [
          "The project is the work of a single author. The idea, the product decisions and — most important for a service like this — the boundaries are the author's: what 2check promises, and what it deliberately does not do.",
          "It is an independent personal project. It is not affiliated with, and does not speak for, any registrar, hosting provider, certificate authority or public body, and it sells nothing.",
        ],
      },
      {
        heading: "How it was made",
        paragraphs: [
          "Specification first, code second. Before the first line was written, the author described the whole product: 28 sections and 218 acceptance criteria, from how a domain name is parsed to the words the service is allowed to use about somebody else's domain. Every behaviour you see on screen answers to a specific clause of that document.",
          "The implementation was written against that specification with the help of artificial-intelligence tools — ChatGPT (OpenAI) and Claude (Anthropic). More and more software is built this way; here it is stated plainly rather than left unsaid. Setting the problems, the architectural decisions, accepting every change and the responsibility for the result remain with the author.",
          "ChatGPT and OpenAI are trademarks of OpenAI; Claude and Anthropic are trademarks of Anthropic. The names appear here to state honestly which tools were used. The project is not affiliated with, endorsed by or sponsored by either company.",
        ],
      },
      {
        heading: "Where the data comes from",
        paragraphs: [
          "DNS records are queried from four public resolvers: Google Public DNS (8.8.8.8), Cloudflare (1.1.1.1), Yandex Basic (77.88.8.8) and Quad9 unfiltered (9.9.9.10). Every query leaves from one location: this is a comparison of resolvers, not a check from several countries.",
          "Registration data for the .uz zone is requested from the .uz registry over RDAP, with a WHOIS fallback where RDAP is not determinate. The certificate is read directly from the host being checked on port 443; no page content is fetched.",
          "The names and trademarks of these services belong to their owners. 2check is not affiliated with them and does not speak for them.",
        ],
      },
      {
        heading: "What is stored",
        paragraphs: [
          "The canonical domain name and the result of the check are stored. The string you typed is discarded before anything is written. Registrant contact values never reach the result: it shows only whether a field is present, redacted by the registry, or unavailable.",
          'No third-party analytics and no advertising networks are loaded, and none could be: the content security policy allows scripts from this origin only. 2check counts its own traffic: anonymous events such as "opened the form", "started a check", "viewed the result" and "opened the technical details", with the language, the page and the scan mode.',
          "Those records contain no domain, no scan identifier, no typed string, no IP address and no registrant data. To join the steps of one visit they carry a random number that lives until the tab closes and is linked to nothing else.",
          "What is kept in your browser is the language, the theme you chose, and a mark that you have been here before.",
        ],
      },
    ],
  },
  uz: {
    title: "Loyiha haqida",
    description:
      "2check nima uchun, uni kim yaratgan, qanday vositalar bilan, ma'lumot manbalari va litsenziyalar.",
    updated: "2026-yil 15-sentyabrda yangilangan.",
    noticesHeading: "Komponentlar va litsenziyalar",
    noticesIntro:
      "2check ochiq kodli komponentlardan yig'ilgan. Quyida tekshiruvning o'zida yoki saytning ishlashida qatnashadiganlari va ular chop etilgan litsenziyalar keltirilgan.",
    licenceColumn: "Litsenziya",
    sections: [
      {
        heading: "Bu sayt nima uchun",
        paragraphs: [
          "2check — notijorat loyiha, tanishtirish va o'rganish maqsadida yaratilgan. U domen haqida tashqaridan ko'rinadigan narsani ko'rsatadi: ommaviy DNS rezolverlarining javoblari, zona reestridagi ro'yxatdan o'tish ma'lumotlari va TLS qo'l siqishida server taqdim etadigan sertifikat.",
          "Natija — bitta joydan, bitta vaqtda qilingan kuzatuv. Bu xavfsizlik auditi ham, yuridik xulosa ham, kafolat ham emas. U eskirishi, boshqa rezolverlar ko'rgan holatdan farq qilishi yoki tashqi manba javob bermaganida to'liq bo'lmasligi mumkin. Oqibati bor qarorlarni registrator, hosting va sertifikat markazining ma'lumotlariga tayanib qabul qiling.",
          "Xizmat «qanday bo'lsa, shundayligicha», hech qanday oshkora yoki nazarda tutilgan kafolatsiz taqdim etiladi. Muallif xizmatdan foydalanish yoki uning natijalariga ishonish oqibatida yuzaga kelgan zarar uchun javobgar emas.",
          "Iltimos, 2check'dan ommaviy avtomatik tekshiruvlar uchun foydalanmang: u bitta serverda ishlaydi va boshqalarning ommaviy xizmatlariga murojaat qiladi.",
        ],
      },
      {
        heading: "Uni kim yaratgan",
        paragraphs: [
          "Loyiha bitta muallif tomonidan yaratilgan. G'oya, mahsulot bo'yicha qarorlar va bunday xizmat uchun eng muhimi — chegaralar muallifga tegishli: 2check nimani va'da qiladi va nimani ataylab qilmaydi.",
          "Bu mustaqil shaxsiy loyiha. U biror registrator, hosting provayderi, sertifikat markazi yoki davlat organi bilan bog'liq emas, ular nomidan chiqmaydi va hech narsa sotmaydi.",
        ],
      },
      {
        heading: "U qanday yaratilgan",
        paragraphs: [
          "Avval spetsifikatsiya, keyin kod. Birinchi satr yozilishidan oldin muallif mahsulotni to'liq tavsiflagan: 28 bo'lim va 218 ta qabul qilish mezoni — domen nomini tahlil qilish qoidalaridan tortib, xizmat birovning domeni haqida qanday so'zlar bilan gapirishi mumkinligigacha. Ekranda ko'rayotgan har bir xatti-harakat shu hujjatning aniq bandiga javob beradi.",
          "Amalga oshirish shu spetsifikatsiya asosida sun'iy intellekt vositalari — ChatGPT (OpenAI) va Claude (Anthropic) yordamida yozilgan. Zamonaviy dasturiy ta'minotning tobora ko'p qismi shunday yaratiladi; bu yerda bu haqda yashirmasdan ochiq aytilgan. Vazifalarni qo'yish, arxitektura qarorlari, har bir o'zgarishni qabul qilish va natija uchun javobgarlik muallifda qoladi.",
          "ChatGPT va OpenAI — OpenAI kompaniyasining tovar belgilari, Claude va Anthropic — Anthropic kompaniyasining tovar belgilari. Nomlar qaysi vositalar ishlatilganini halol ko'rsatish uchun keltirilgan. Loyiha bu kompaniyalar bilan bog'liq emas, ular tomonidan qo'llab-quvvatlanmaydi va ma'qullanmagan.",
        ],
      },
      {
        heading: "Ma'lumotlar qayerdan olinadi",
        paragraphs: [
          "DNS yozuvlari to'rtta ommaviy rezolverdan so'raladi: Google Public DNS (8.8.8.8), Cloudflare (1.1.1.1), Yandex Basic (77.88.8.8) va filtrsiz Quad9 (9.9.9.10). Barcha so'rovlar bitta joydan yuboriladi: bu rezolverlarni solishtirish, turli mamlakatlardan tekshirish emas.",
          ".uz zonasidagi ro'yxatdan o'tish ma'lumotlari .uz reestridan RDAP orqali so'raladi, aniq javob bo'lmasa — zaxira WHOIS so'rovi bilan. Sertifikat tekshirilayotgan tugunning 443-portidan bevosita o'qiladi; sahifa mazmuni yuklanmaydi.",
          "Bu xizmatlarning nomlari va tovar belgilari ularning egalariga tegishli. 2check ular bilan bog'liq emas va ular nomidan chiqmaydi.",
        ],
      },
      {
        heading: "Nima saqlanadi",
        paragraphs: [
          "Bazada kanonik domen nomi va tekshiruv natijasi saqlanadi. Siz kiritgan satr saqlashdan oldin tashlab yuboriladi. Domen egasining aloqa ma'lumotlari natijaga tushmaydi: faqat maydon to'ldirilgani, reestr tomonidan yashirilgani yoki mavjud emasligi ko'rsatiladi.",
          "Saytda uchinchi tomon analitikasi va reklama tarmoqlari ulanmagan va ulanishi ham mumkin emas: kontent xavfsizligi siyosati skriptlarga faqat shu manzildan ruxsat beradi. Tashriflarni 2check o'zi sanaydi: «forma ochildi», «tekshiruv boshlandi», «natija ko'rildi», «texnik tafsilotlar ochildi» kabi shaxssiz hodisalar til, sahifa va tekshiruv rejimi bilan yoziladi.",
          "Bu yozuvlarda tekshirilayotgan domen ham, tekshiruv identifikatori ham, kiritilgan satr ham, IP-manzil ham, domen egasining ma'lumotlari ham yo'q. Bitta tashrif qadamlarini bog'lash uchun tasodifiy raqam ishlatiladi: u varaq yopilguncha yashaydi va boshqa hech narsa bilan bog'lanmagan.",
          "Brauzerda tanlangan til, tanlangan mavzu va bu yerda avval bo'lganingiz haqidagi belgi saqlanadi.",
        ],
      },
    ],
  },
};
