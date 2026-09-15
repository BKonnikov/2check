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
          "Проект создал Борис Конников. Это личный проект. Он не связан ни с одним регистратором, хостинг-провайдером, удостоверяющим центром или государственным органом и не выступает от их имени.",
        ],
      },
      {
        heading: "Как он сделан",
        paragraphs: [
          "Значительная часть кода, интерфейсных текстов и документации этого проекта написана с помощью инструментов искусственного интеллекта — ChatGPT (OpenAI) и Claude (Anthropic). Автор проверял и принимал результат их работы и отвечает за него.",
          "ChatGPT и OpenAI — товарные знаки OpenAI. Claude и Anthropic — товарные знаки Anthropic. Названия приведены здесь только для того, чтобы честно указать использованные инструменты. Проект не связан с этими компаниями, не поддерживается и не одобрен ими.",
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
          "Сторонняя аналитика и рекламные сети на сайте не подключены. В браузере сохраняются только выбранный язык и выбранная тема оформления.",
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
          "The project was created by Boris Konnikov. It is a personal project. It is not affiliated with, and does not speak for, any registrar, hosting provider, certificate authority or public body.",
        ],
      },
      {
        heading: "How it was made",
        paragraphs: [
          "A substantial part of this project's code, interface copy and documentation was written with the help of artificial-intelligence tools — ChatGPT (OpenAI) and Claude (Anthropic). The author reviewed and accepted their output and is responsible for it.",
          "ChatGPT and OpenAI are trademarks of OpenAI. Claude and Anthropic are trademarks of Anthropic. The names appear here only to state honestly which tools were used. The project is not affiliated with, endorsed by or sponsored by either company.",
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
          "No third-party analytics and no advertising networks are loaded. The only things kept in your browser are the language and the theme you chose.",
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
          "Loyihani Boris Konnikov yaratgan. Bu shaxsiy loyiha. U biror registrator, hosting provayderi, sertifikat markazi yoki davlat organi bilan bog'liq emas va ular nomidan chiqmaydi.",
        ],
      },
      {
        heading: "U qanday yaratilgan",
        paragraphs: [
          "Loyihaning kodi, interfeys matnlari va hujjatlarining katta qismi sun'iy intellekt vositalari — ChatGPT (OpenAI) va Claude (Anthropic) yordamida yozilgan. Muallif ularning natijasini tekshirib qabul qilgan va uning uchun javobgar.",
          "ChatGPT va OpenAI — OpenAI kompaniyasining tovar belgilari. Claude va Anthropic — Anthropic kompaniyasining tovar belgilari. Nomlar bu yerda faqat qaysi vositalar ishlatilganini halol ko'rsatish uchun keltirilgan. Loyiha bu kompaniyalar bilan bog'liq emas, ular tomonidan qo'llab-quvvatlanmaydi va ma'qullanmagan.",
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
          "Saytda uchinchi tomon analitikasi va reklama tarmoqlari ulanmagan. Brauzerda faqat siz tanlagan til va mavzu saqlanadi.",
        ],
      },
    ],
  },
};
