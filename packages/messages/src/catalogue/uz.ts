import type { Catalogue } from "../types.js";

/**
 * PRD 13.6 — Uzbek is a mandatory language.
 *
 * Latin script, as used officially in Uzbekistan. This translation was written by Claude at the
 * owner's request and has NOT been reviewed by a native speaker: CATALOGUE_REVIEW marks it as
 * unreviewed, so the gap stays visible even though the catalogue is complete. Wording aimed at
 * the Uzbek market should be read by a person before launch.
 *
 * The same rules as the other catalogues apply: UNKNOWN never accuses the target, PASS states
 * the fact rather than reassuring, and no causal claim is made that the data does not support.
 */
export const uz: Catalogue = {
  "dns.name.existence.pass": {
    title: "Nom DNS da mavjud",
    explanation:
      "Ommaviy rezolverlar bu nomni biladi. Bu hali sayt ochiladi degani emas — faqat DNS da nom bor degani.",
  },
  "dns.name.existence.fail": {
    title: "Nom DNS da mavjud emas",
    explanation: "Rezolverlar bu nom DNS zonasida yo'qligiga qo'shiladi.",
    impact: "Bu nomga tayanadigan hech narsa ishlamaydi: na sayt, na pochta, na sertifikat.",
    recommendation: "Yozilishini, domen delegatsiyasini va zona chop etilganini tekshiring.",
  },
  "dns.name.existence.unknown": {
    title: "Nom mavjudligini aniqlab bo'lmadi",
    explanation: "Xulosa chiqarish uchun yaroqli javob bergan rezolverlar juda kam bo'ldi.",
  },

  "dns.record.resolve.present": { title: "{recordType} yozuvlari topildi" },
  "dns.record.resolve.present.mail": {
    title: "Domen pochtasi {service} xizmatiga yetkaziladi",
    explanation:
      "MX yozuvlari domen pochtasi qayerga yetkazilishini ko'rsatadi va bu yerda ular {service} ga ishora qiladi. Bu yozuvlarni o'qish natijasi, kompaniya ichida nimadan foydalanishi haqidagi da'vo emas: yozuvlar eski sozlamadan qolgan bo'lishi mumkin.",
  },
  "dns.record.resolve.absent": { title: "{recordType} yozuvi topilmadi" },
  "dns.record.resolve.name_not_found": {
    title: "Nom mavjud emas, shuning uchun {recordType} baholanmadi",
  },
  "dns.record.resolve.unknown": {
    title: "Rezolverlar {recordType} bo'yicha kelisha olmadi",
    explanation:
      "Xulosa chiqarish uchun bir-biriga mos javoblar yetarli bo'lmadi. Zona o'zgartirilgandan keyin bu odatiy hol: ba'zi rezolverlar oldingi javobni kesh muddati tugaguncha eslab turadi.",
  },
  "dns.record.resolve.unknown.split": {
    title: "Rezolverlar {recordType} bo'yicha kelisha olmadi",
    fact: "Yozuvni ko'radi: {seeing}. Ko'rmaydi: {missing}",
    explanation:
      "Xulosa chiqarish uchun bir-biriga mos javoblar yetarli bo'lmadi. Zona o'zgartirilgandan keyin bu odatiy hol: ba'zi rezolverlar oldingi javobni kesh muddati tugaguncha eslab turadi.",
  },

  "dns.record.consistency.pass": {
    title: "Rezolverlar {recordType} bo'yicha bir xil javob berdi",
    explanation:
      "Biz bir nechta mustaqil ommaviy rezolverdan so'raymiz. Javoblar bir xil bo'lsa, o'zgarish tarqalgan va tashrifchilar qaysi provayderdan foydalanishidan qat'i nazar bir xil natijani ko'radi.",
  },
  "dns.record.consistency.fail": {
    title: "Rezolverlar {recordType} bo'yicha turlicha javob berdi",
    fact: "Yozuvni ko'radi: {seeing}. Ko'rmaydi: {missing}",
    explanation:
      "Ba'zi rezolverlar yozuvni ko'radi, ba'zilari ko'rmaydi. Ko'pincha bu zonadagi yaqinda qilingan o'zgarish hali barcha keshlarga yetib bormagani; kamroq hollarda vakolatli serverlarning o'zi farq qiladi.",
    impact: "Tashrifchilar qaysi rezolverdan foydalanishiga qarab turlicha javob olishi mumkin.",
    recommendation:
      "Yozuv yaqinda qo'shilgan yoki o'zgartirilgan bo'lsa, bir necha daqiqa kutib, tekshiruvni qayta ishga tushiring. Farq saqlanib qolsa, zonani barcha vakolatli serverlarda solishtiring.",
  },

  "registry.lookup.registered": {
    title: "Domen ro'yxatdan o'tgan",
    explanation: "Zona reestri ro'yxatdan o'tganini tasdiqlaydi.",
  },
  "registry.lookup.registered.registrar": {
    title: "Domen {registrar} orqali ro'yxatdan o'tgan",
    explanation:
      "Registrator — domen to'lanadigan va uzaytiriladigan kompaniya. Reestr bu javobda sanalarni qaytarmadi.",
  },
  "registry.lookup.registered.record": {
    title: "Domen {registrar} orqali ro'yxatdan o'tgan",
    fact: "{createdAt} da ro'yxatdan o'tgan · {expiresAt} gacha to'langan",
    explanation:
      "Reestrdagi yozuv {createdAt} sanasida yaratilgan va {expiresAt} gacha to'langan. Registrator — domen uzaytiriladigan kompaniya: nom serverlarini o'zgartirish yoki muddatni uzaytirish uchun unga murojaat qilinadi. Nom serverlari va yozuv holati texnik tafsilotlarda.",
  },
  "registry.lookup.not_registered": {
    title: "Reyestr domen ro'yxatdan o'tmagan deb xabar qilmoqda",
    explanation: "Vakolatli reyestr xizmati ro'yxat yo'qligini tasdiqladi.",
  },
  "registry.lookup.indeterminate": {
    title: "Ro'yxat ma'lumotlarini olishning iloji bo'lmadi",
    explanation:
      "Reyestr xizmati yaroqli javob qaytarmadi. Bu domen ro'yxatdan o'tgan yoki o'tmagani haqida hech narsa demaydi.",
  },
  "registry.lookup.provider_not_supported": {
    title: "2check bu zonada ro'yxatni tekshirmaydi",
    explanation:
      "Ro'yxatni tekshirish hozircha faqat .uz zonasini qamrab oladi. Bu xizmatning cheklovi, domenning muammosi emas.",
  },

  "tls.connection.pass": {
    title: "{ipFamily} orqali ulanish o'rnatildi, protokol {protocol}",
    explanation:
      "Biz 443-portga ulandik va himoyalangan kanal haqida kelishdik. Protokol versiyasi — brauzer bilan server orasidagi trafikni shifrlaydigan narsa; bugun TLSv1.2 va TLSv1.3 dolzarb.",
  },
  "tls.connection.fail": {
    title: "{ipFamily} orqali TLS ulanishini o'rnatib bo'lmadi",
    explanation: "Manzil javob berdi, lekin ulanish yoki qo'l siqish yakunlanmadi.",
    impact: "{ipFamily} orqali keladigan brauzerlar saytni himoyalangan holda ocholmaydi.",
    recommendation:
      "Bu manzilda 443-port xizmat ko'rsatayotganini va TLS xizmati ishga tushganini tekshiring.",
  },
  "tls.connection.fail.timeout": {
    title: "Server {ipFamily} orqali javob bermadi",
    explanation: "443-portga ulanish boshlandi, ammo kutish tugaguncha javob kelmadi.",
    impact: "{ipFamily} orqali keladigan tashrifchilar saytni xavfsiz ocholmaydi.",
    recommendation:
      "Bu manzilda 443-port ochiqligini va uni tarmoqlararo ekran to'smayotganini tekshiring.",
  },
  "tls.connection.fail.refused": {
    title: "Server {ipFamily} orqali ulanishni rad etdi",
    explanation: "Manzil rad javobi berdi: 443-portda ulanishlarni hech kim qabul qilmayapti.",
    impact: "{ipFamily} orqali keladigan tashrifchilar saytni xavfsiz ocholmaydi.",
    recommendation:
      "Bu manzilda TLS xizmati ishlayotganini va 443-portni tinglayotganini tekshiring.",
  },
  "tls.connection.own_infrastructure": {
    title: "Bu domen 2check'ning o'z infratuzilmasida joylashgan",
    explanation:
      "2check o'z manzillarini tekshirmaydi: o'z tarmog'i ichidan o'ziga qarash — xizmat va'da qilgan tashqi nigoh emas, natija ishonchli bo'lmaydi. Bu domenning ulanishi va sertifikatini boshqa vosita bilan tekshiring.",
  },
  "tls.connection.unknown": {
    title: "{ipFamily} orqali TLS ulanishini tekshirib bo'lmadi",
    explanation:
      "Tekshiruv bizning tomonimizda yakunlanmadi, maqsad haqida hech narsa kuzatilmadi.",
  },
  "tls.connection.not_applicable": { title: "{ipFamily} manzili yo'q, ulanadigan joy yo'q" },

  "tls.certificate.validity.pass": {
    title: "Sertifikat yana {daysRemaining} kun amal qiladi",
    explanation:
      "Har bir sertifikatning muddati bor. Muddat tugagach, brauzerlar saytni ogohlantirishsiz ochmay qo'yadi, shuning uchun uni oldindan uzaytirgan ma'qul.",
  },
  "tls.certificate.validity.fail": {
    title: "Sertifikat amal qilish muddatidan tashqarida",
    explanation: "Sertifikat muddati tugagan yoki hali boshlanmagan.",
    impact: "Brauzerlar ogohlantirish ko'rsatadi va tashrifchilarning ko'pchiligi davom etmaydi.",
    recommendation: "Sertifikatni qayta chiqaring yoki uzaytiring va TLS xizmatini qayta yuklang.",
  },
  "tls.certificate.validity.blocked": { title: "Sertifikat baholanmadi" },

  "tls.certificate.hostname.pass": {
    title: "Sertifikat bu xost nomini qamrab oladi",
    explanation:
      "Sertifikat nomlar ro'yxati uchun beriladi. Tekshirilayotgan nom shu ro'yxatda bor — to'g'ridan-to'g'ri yoki *.example.uz ko'rinishidagi niqob orqali.",
  },
  "tls.certificate.hostname.fail": {
    title: "Sertifikat bu xost nomini qamrab olmaydi",
    explanation: "Nom sertifikatdagi muqobil sub'ekt nomlari orasida yo'q.",
    impact: "Brauzerlar nom mos kelmasligi haqida ogohlantirish ko'rsatadi.",
    recommendation: "Sertifikatni bu nomni qo'shgan holda qayta chiqaring.",
  },
  "tls.certificate.hostname.blocked": { title: "Nom mosligi baholanmadi" },

  "tls.certificate.chain.pass": {
    title: "Sertifikatlar zanjiri ishonchli",
    explanation:
      "Sayt sertifikatini oraliq markaz imzolagan, uni esa ildiz markaz, ildiz markazga esa operatsion tizim ishonadi. Shu imzolar ketma-ketligi zanjir deyiladi: u oxirigacha qurildi, demak brauzer sertifikatni ogohlantirishsiz qabul qiladi.",
  },
  "tls.certificate.chain.fail": {
    title: "Sertifikatlar zanjiri ishonchsiz",
    explanation:
      "Zanjir o'z-o'zini imzolagan yoki server yuborgan sertifikatlar bo'yicha ishonchli ildizgacha qurilmaydi.",
    impact: "Bu zanjirga oldindan ishonmaydigan mijozlar ulanishdan bosh tortadi.",
    recommendation: "To'liq zanjirni, shu jumladan oraliq sertifikatlarni ham bering.",
  },
  "tls.certificate.chain.unknown": {
    title: "Sertifikat zanjiriga ishonchni tekshirib bo'lmadi",
    explanation:
      "Tekshiruv sertifikatdagi boshqa nomuvofiqlikda to'xtadi, shuning uchun zanjirga yetib borilmadi. Bu zanjirda nuqson bor degani emas.",
  },
  "tls.certificate.chain.blocked": { title: "Sertifikatlar zanjiri baholanmadi" },

  "verdict.HEALTHY": { title: "Muammo topilmadi" },
  "verdict.RECOMMENDATIONS": { title: "Tavsiyalar bor" },
  "verdict.PROBLEMS": { title: "Muammolar topildi" },
  "verdict.CRITICAL_PROBLEM": { title: "Jiddiy muammo" },
  "verdict.NO_CONFIRMED_ISSUES_INCOMPLETE": {
    title: "Tasdiqlangan muammo yo'q, lekin manzara to'liq emas",
    explanation:
      "Ba'zi tekshiruvlarni yakunlab bo'lmadi, shuning uchun bu to'liq sog'liq xulosasi emas.",
  },

  "email.mx.records.present": {
    title: "Qabul qiluvchi serverlar ko'rsatilgan",
    fact: "Yaroqli xostlar: {count}",
    explanation:
      "MX yozuvlari jo'natuvchilar shu domen uchun pochtani yetkazadigan serverlarni afzallik tartibida nomlaydi.",
  },
  "email.mx.records.present.service": {
    title: "Domen pochtasini {service} qabul qiladi",
    fact: "Yaroqli xostlar: {count}",
    explanation:
      "MX yozuvlari shu xizmatning xostlariga ishora qiladi. Bu yozuvlardan o'qilgan va yetkazish qayerga yo'naltirilganini bildiradi, tashkilot nimadan foydalanishini emas.",
  },
  "email.mx.records.present.forwarding": {
    title: "Domen pochtasini {service} qayta yo'naltirishi qabul qiladi",
    fact: "Yaroqli xostlar: {count}",
    explanation:
      "{service} — qayta yo'naltirish xizmati: u xatni qabul qiladi va boshqa manzilga uzatadi, o'zida pochta qutisi saqlamaydi. Yozuvlar oddiy pochta provayderiniki kabi ko'rinadi, tuzilishi esa boshqacha — shuning uchun bu alohida aytiladi.",
  },
  "email.mx.records.null": {
    title: "Domen pochta qabul qilmasligini e'lon qilgan",
    fact: "Xosti bo'lmagan MX yozuvi e'lon qilingan",
    explanation:
      "RFC 7505 bunday yozuvni egasining aniq e'loni deb belgilaydi. Jo'natuvchi buni darhol biladi va xatni navbatda ushlab turmaydi.",
  },
  "email.mx.records.fail.implicit": {
    title: "MX yozuvlari yo'q, pochta domenning manzil yozuvlari bo'yicha boradi",
    explanation:
      "RFC 5321 bo'yicha MX topa olmagan jo'natuvchi domenning o'z manzil yozuvlariga murojaat qiladi. Pochta yetib boradi — sayt uchun javob beradigan xostga.",
    impact: "Pochta qayerga yetkazilishini boshqa savolga javob beradigan yozuv hal qiladi.",
    recommendation:
      "Domen pochta qabul qilsa MX yozuvlarini, qabul qilmasa xosti bo'lmagan MX yozuvini e'lon qiling.",
  },
  "email.mx.records.fail.missing": {
    title: "Domenda na MX, na manzil yozuvlari bor",
    explanation: "Jo'natuvchida bu domen uchun pochtani yetkazadigan joy yo'q.",
    impact: "Domen yozuvlari pochtani yo'naltirish mumkin bo'lgan birorta manzilni nomlamaydi.",
    recommendation:
      "Domen pochta qabul qilishi kerak bo'lsa MX yozuvlarini, kerak bo'lmasa xosti bo'lmagan MX yozuvini e'lon qiling.",
  },
  "email.mx.records.fail.unusable": {
    title: "MX yozuvlaridagi birorta xost yaroqli emas",
    fact: "Yaroqsiz xostlar: {count}",
    explanation: "Xostlarda manzil yozuvlari yo'q yoki nom o'rniga manzil yozilgan.",
    impact: "MX yozuvlari e'lon qilingan bo'lsa-da, jo'natuvchida yetkazadigan joy yo'q.",
    recommendation:
      "MX yozuvlaridagi xost nomlarini va shu nomlarning manzil yozuvlarini tekshiring.",
  },
  "email.mx.records.fail.literal": {
    title: "MX yozuvida nom o'rniga manzil yozilgan",
    fact: "Bunday yozuvlar: {hosts}",
    explanation: "MX yozuvining xosti IP manzil emas, domen nomi bo'lishi kerak.",
    impact: "Jo'natuvchilar bunday yozuvdan foydalanmaydi.",
    recommendation: "Serverga nom bering, MX ga shuni, manzilni esa A yoki AAAA yozuviga qo'ying.",
  },
  "email.mx.records.fail.alias": {
    title: "MX xosti taxallus (CNAME)",
    fact: "Bunday xostlar: {hosts}",
    explanation:
      "RFC 2181 MX xosti CNAME taxallusi emas, manzil yozuvlariga ega nom bo'lishini talab qiladi.",
    impact: "Ayrim jo'natuvchilar bunday yozuvni boshqalardan farqli ishlaydi.",
    recommendation: "MX da o'z A yoki AAAA yozuvlariga ega nomni ko'rsating.",
  },
  "email.mx.records.fail.partial": {
    title: "MX yozuvlaridagi ayrim xostlar yaroqsiz",
    fact: "Manzil yozuvlarisiz: {hosts}",
    explanation: "Bu nomlarda A yoki AAAA yozuvlari yo'q, shuning uchun ularga ulanib bo'lmaydi.",
    impact:
      "Yetkazish qolgan xostlar orqali davom etadi; egasi mo'ljallagan zaxira ko'ringanidan kichik.",
    recommendation: "Bu nomlarga manzil yozuvlarini bering yoki ularni MX dan olib tashlang.",
  },
  "email.mx.records.unknown": {
    title: "Qabul qiluvchi serverni aniqlash imkoni bo'lmadi",
    explanation:
      "So'rovlar aniq natija bermadi. Bu yozuvlar yo'q yoki xostlar yaroqsiz degani emas.",
  },
  "email.spf.record.present": {
    title: "Jo'natish siyosati e'lon qilingan",
    fact: "Bitta SPF yozuvi",
    explanation:
      "SPF — bu DNS yozuvi bo'lib, unda domen egasi o'z nomidan pochta jo'natadigan serverlarni sanab o'tadi.",
  },
  "email.spf.record.fail.absent": {
    title: "Jo'natish siyosati e'lon qilinmagan",
    explanation:
      "SPF — bu DNS yozuvi bo'lib, unda domen egasi o'z nomidan pochta jo'natadigan serverlarni sanab o'tadi. Qabul qiluvchi xat kelgan manzilni shu ro'yxat bilan solishtiradi.",
    impact: "Qabul qiluvchida jo'natuvchi manzilini solishtirish uchun hech narsa yo'q.",
    recommendation:
      "v=spf1 bilan boshlanadigan TXT yozuvini e'lon qiling va o'zingiz jo'natadigan serverlarni sanab o'ting.",
  },
  "email.spf.record.fail.multiple": {
    title: "SPF yozuvlari bir nechta",
    fact: "Topilgan yozuvlar: {count}",
    explanation: "RFC 7208 bir domenga faqat bitta SPF yozuviga ruxsat beradi.",
    impact: "Qabul qiluvchi ulardan birini tanlamaydi, balki siyosatni butunlay rad etadi.",
    recommendation: "Bitta yozuvni qoldiring va qolganlarining mazmunini unga ko'chiring.",
  },
  "email.spf.record.fail.unparseable": {
    title: "SPF yozuvi tahlil qilinmaydi",
    explanation: "Yozuvda RFC 7208 grammatikasida yo'q atama bor.",
    impact: "Qabul qiluvchi bunday siyosatni butunlay rad etadi.",
    recommendation: "Yozuvdagi mexanizm va modifikatorlarda xato bor-yo'qligini tekshiring.",
  },
  "email.spf.record.unknown": {
    title: "SPF yozuvini olish imkoni bo'lmadi",
    explanation: "TXT so'rovi aniq natija bermadi. Bu yozuv yo'q degani emas.",
  },
  "email.spf.limits.pass": {
    title: "Yozuv o'tish cheklovlariga sig'adi",
    fact: "DNS so'rovi keltiradigan atamalar: {limit} dan {count} ta",
  },
  "email.spf.limits.fail.lookups": {
    title: "Yozuvda DNS so'rovi keltiradigan atamalar {limit} tadan ko'p",
    fact: "DNS so'rovi keltiradigan atamalar: {count}",
    explanation:
      "RFC 7208 bitta tekshiruvda hisoblanadigan include, a, mx, ptr, exists va redirect atamalari sonini cheklaydi, ichki yozuvlar ham shunga kiradi.",
    impact: "Chegaradan oshish qabul qiluvchida yozuv xatosini beradi.",
    recommendation:
      "Ichki include lar sonini kamaytiring yoki ularning bir qismini aniq ip4 va ip6 manzillariga almashtiring.",
  },
  "email.spf.limits.fail.void": {
    title: "Yozuvda javobsiz nomlar {limit} tadan ko'p",
    fact: "Javobsiz nomlar: {count}",
    explanation:
      "RFC 7208 hech narsa qaytarmagan yoki mavjud bo'lmagan nomga tushgan so'rovlar sonini cheklashni tavsiya qiladi.",
    impact:
      "Qabul qiluvchilar bu tavsiyaga turlicha amal qiladi, shuning uchun yozuv ularda har xil ishlaydi.",
    recommendation: "Yozuvdan endi mavjud bo'lmagan nomlarni olib tashlang.",
  },
  "email.spf.limits.fail.loop": {
    title: "Yozuvni o'tish aylanib qolgan",
    fact: "Nom ikki marta uchradi: {name}",
    explanation: "Ichki yozuvlardan biri allaqachon o'tilgan nomga qaytib ishora qiladi.",
    impact: "Qabul qiluvchi hisoblashni to'xtatadi va yozuvni xato deb biladi.",
    recommendation: "include yoki redirect zanjirini yopadigan havolani olib tashlang.",
  },
  "email.spf.limits.unknown": {
    title: "Yozuvni o'tish tugamadi",
    fact: "O'tilgan, DNS so'rovi keltiradigan atamalar: {count}",
    explanation:
      "Ayrim ichki nomlarni o'tish imkoni bo'lmadi, shuning uchun atamalar soni to'liq ma'lum emas va chegaradan oshish haqida hukm chiqarib bo'lmaydi.",
  },
  "email.spf.limits.blocked": { title: "O'tish cheklovlari tekshirilmadi" },
  "email.spf.policy.pass.reject": {
    title: "Ro'yxatda yo'q jo'natuvchilar rad etiladi",
    fact: "Yozuv -all bilan tugaydi",
  },
  "email.spf.policy.pass.mark": {
    title: "Ro'yxatda yo'q jo'natuvchilar belgilanadi",
    fact: "Yozuv ~all bilan tugaydi",
    explanation:
      "Ro'yxatda yo'q manzildan kelgan xat qabul qilinadi, lekin belgilanadi. Bu jo'natuvchilar ro'yxatini hali aniqlayotgan domen uchun ish rejimi.",
  },
  "email.spf.policy.fail.neutral": {
    title: "Yozuv ro'yxatda yo'q jo'natuvchilar haqida hech nima demaydi",
    fact: "Yozuv ?all bilan tugaydi",
    explanation: "?all mexanizmi egasi bunday manzillar uchun natijani belgilamaganini bildiradi.",
    impact: "Qabul qiluvchida yozuvda yo'q manzildan kelgan xatga qo'llaydigan narsa yo'q.",
    recommendation:
      "Jo'natuvchilar ro'yxati to'liq bo'lgach, ?all ni ~all yoki -all ga almashtiring.",
  },
  "email.spf.policy.fail.open": {
    title: "Yozuv istalgan manzildan jo'natishga ruxsat beradi",
    fact: "Yozuv +all bilan tugaydi",
    explanation: "+all mexanizmi istalgan manzilga ijobiy SPF natijasini beradi.",
    impact: "Yozuv jo'natuvchilar doirasini cheklamaydi.",
    recommendation:
      "+all ni -all ga almashtiring va jo'natuvchi serverlaringizni aniq sanab o'ting.",
  },
  "email.spf.policy.fail.absent": {
    title: "Yozuvda na all, na redirect bor",
    explanation: "Yakuniy mexanizmsiz yozuv unda sanalmagan manzillar uchun natijani belgilamaydi.",
    impact: "Qabul qiluvchida bunday manzildan kelgan xatga qo'llaydigan narsa yo'q.",
    recommendation: "Yozuv oxiriga -all yoki ~all qo'shing.",
  },
  "email.spf.policy.unknown": {
    title: "Yakuniy siyosatni o'qish imkoni bo'lmadi",
    explanation:
      "Yozuv qarorni redirect orqali boshqa yozuvga topshiradi, uni oxirigacha o'tish imkoni bo'lmadi.",
  },
  "email.spf.policy.blocked": { title: "Yakuniy siyosat baholanmadi" },
  "email.spf.deprecated.fail.ptr": {
    title: "Yozuvda ptr mexanizmi ishlatilgan",
    explanation:
      "RFC 7208 ptr ni e'lon qilishni tavsiya qilmaydi: u sekin va ishonchsiz teskari so'rovlarni talab qiladi.",
    impact: "Ayrim qabul qiluvchilar bu mexanizmni boshqalardan farqli ishlaydi.",
    recommendation: "ptr ni aniq ip4 va ip6 manzillariga yoki a mexanizmiga almashtiring.",
  },
  "email.spf.deprecated.absent": { title: "Yozuvda eskirgan mexanizm yo'q" },
  "email.spf.deprecated.blocked": { title: "Yozuv mexanizmlari tekshirilmadi" },
  "email.dmarc.record.present": {
    title: "DMARC siyosati e'lon qilingan",
    fact: "Domenning o'z yozuvi mavjud",
    explanation:
      "DMARC — domen egasi qabul qiluvchilarga SPF ham, DKIM ham tasdiqlamagan xat bilan nima qilish kerakligini aytadigan DNS yozuvi.",
  },
  "email.dmarc.record.present.inherited": {
    title: "DMARC siyosati {source} domenidan olinadi",
    fact: "Domenning o'z yozuvi yo'q",
    explanation:
      "RFC 9989 qabul qiluvchiga yuqoridagi domen siyosatini olishga ruxsat beradi. Subdomen uchun bu oddiy ish tartibi.",
  },
  "email.dmarc.record.present.suffix": {
    title: "DMARC siyosatini {source} suffiksi belgilaydi",
    fact: "Domenning o'z yozuvi yo'q",
    explanation:
      "Yozuv ommaviy suffiks darajasida e'lon qilingan va uning ostidagi domenlarga qo'llanadi.",
  },
  "email.dmarc.record.fail.absent": {
    title: "DMARC siyosati e'lon qilinmagan",
    explanation:
      "DMARC — domen egasi qabul qiluvchilarga SPF ham, DKIM ham tasdiqlamagan xat bilan nima qilish kerakligini aytadigan DNS yozuvi.",
    impact:
      "Qabul qiluvchida domen nomidan kelgan, tekshiruvdan o'tmagan xatga qo'llaydigan narsa yo'q.",
    recommendation:
      "_dmarc nomida v=DMARC1; p=none; rua=mailto:dmarc@sizningdomen qiymatli TXT yozuvini e'lon qiling, keyin karantin va rad etishga o'ting.",
  },
  "email.dmarc.record.fail.multiple": {
    title: "DMARC yozuvlari bir nechta",
    fact: "Topilgan yozuvlar: {count}",
    explanation: "RFC 9989 bitta nomga faqat bitta DMARC yozuviga ruxsat beradi.",
    impact: "Qabul qiluvchi ulardan birini tanlamaydi, hammasini chetga suradi.",
    recommendation: "_dmarc nomida bitta yozuv qoldiring.",
  },
  "email.dmarc.record.fail.unrecognised": {
    title: "DMARC yozuvi tan olinmaydi",
    explanation:
      "DMARC1 qiymatli v tegi yozuvda birinchi turishi kerak va bu qiymat aynan shunday yoziladi.",
    impact: "Qabul qiluvchi bunday yozuvni qo'llamaydi va siyosat yo'qdek ish ko'radi.",
    recommendation: "Yozuvni v=DMARC1; bilan boshlang va bu qiymatning harf registrini tekshiring.",
  },
  "email.dmarc.record.unknown": {
    title: "DMARC yozuvini olish imkoni bo'lmadi",
    explanation: "TXT so'rovi aniq natija bermadi. Bu yozuv yo'q degani emas.",
  },
  "email.dmarc.record.unknown.walk": {
    title: "Nomlar daraxti bo'ylab yurish tugamadi",
    fact: "Bajarilgan so'rovlar: {count}",
    explanation:
      "RFC 9989 subdomen siyosatini nomlar daraxti bo'ylab yuqoriga ko'tarilib qidiradi. So'rovlarning bir qismi aniq natija bermadi, shuning uchun yuqoridagi siyosat haqida hukm chiqarib bo'lmaydi.",
  },
  "email.dmarc.policy.pass.reject": {
    title: "Yozuv tekshirilmagan xatlarni rad etishni so'raydi",
    fact: "{source} domenining {tag} tegi: reject",
  },
  "email.dmarc.policy.pass.quarantine": {
    title: "Yozuv tekshirilmagan xatlarni karantinga joylashni so'raydi",
    fact: "{source} domenining {tag} tegi: quarantine",
    explanation:
      "Karantin — o'z jo'natuvchilari ro'yxatini hali aniqlab olayotgan domen uchun ish tartibi.",
  },
  "email.dmarc.policy.fail.none": {
    title: "Yozuv tekshirilmagan xatlar bilan hech narsa qilishni so'ramaydi",
    fact: "{source} domenining {tag} tegi: none",
    explanation:
      "none qiymati — kuzatish tartibi: domen egasi hisobotlarni yig'adi, lekin ishlov berishni belgilamaydi.",
    impact:
      "Qabul qiluvchida domen nomidan kelgan, tekshiruvdan o'tmagan xatga qo'llaydigan narsa yo'q.",
    recommendation:
      "Hisobotlarni tahlil qilgach, p=none ni p=quarantine ga, so'ngra p=reject ga o'zgartiring.",
  },
  "email.dmarc.policy.fail.absent": {
    title: "Yozuvda siyosat tegi yo'q",
    fact: "{source} domenining yozuvida na p, na sp, na np bor",
    explanation: "Siyosat tegisiz yozuv p=none bilan bir xil o'qiladi.",
    impact:
      "Qabul qiluvchida domen nomidan kelgan, tekshiruvdan o'tmagan xatga qo'llaydigan narsa yo'q.",
    recommendation: "none, quarantine yoki reject qiymatli p tegini qo'shing.",
  },
  "email.dmarc.policy.blocked": { title: "DMARC siyosati baholanmadi" },
  "email.dmarc.reports.present.at": {
    title: "Yozuv jamlangan hisobotlarni so'raydi",
    fact: "Qabul qiluvchi domenlar: {domains}",
    explanation:
      "Jamlangan hisobotlar domen nomidan kim xat jo'natayotganini va bu xatlar tekshiruvdan qanday o'tayotganini ko'rsatadi. Qabul qiluvchi domen yozuvda ko'rinadi va hisobotlar uchinchi tomon xizmatiga ketayotganini aytadi.",
  },
  "email.dmarc.reports.present": {
    title: "Yozuv jamlangan hisobotlarni so'raydi",
    fact: "Yozuvda rua tegi mavjud",
    explanation:
      "Jamlangan hisobotlar domen nomidan kim xat jo'natayotganini va bu xatlar tekshiruvdan qanday o'tayotganini ko'rsatadi.",
  },
  "email.dmarc.reports.fail.absent": {
    title: "Yozuv jamlangan hisobotlarni so'ramaydi",
    explanation:
      "rua tegi qabul qiluvchilar DMARC jamlangan hisobotlarini yuboradigan manzilni ataydi.",
    impact: "Bu mexanizm domen nomidan kim xat jo'natayotgani haqida ma'lumot bermaydi.",
    recommendation: "mailto:dmarc@example.uz turidagi manzil bilan rua tegini qo'shing.",
  },
  "email.dmarc.reports.blocked": { title: "Hisobot so'rovi tekshirilmadi" },
  "email.dmarc.deprecated.absent": { title: "Yozuvda eskirgan teglar yo'q" },
  "email.dmarc.deprecated.fail.pct": {
    title: "Yozuvda pct tegi ishlatilgan",
    explanation:
      "RFC 9989 pct tegini olib tashladi. Yangi standartga amal qiluvchi qabul qiluvchi uni hisobga olmaydi, RFC 7489 ga amal qiluvchi esa siyosatni tegda ko'rsatilgan xatlar ulushiga qo'llaydi.",
    impact: "Qabul qiluvchilar domen siyosatini bir-biridan farqli qo'llaydi.",
    recommendation: "pct tegini yozuvdan olib tashlang.",
  },
  "email.dmarc.deprecated.blocked": { title: "DMARC yozuvining teglari tekshirilmadi" },

  "email.dkim.key.present": {
    title: "DKIM kaliti e'lon qilingan",
    fact: "Selektor {selector}",
    explanation:
      "DKIM — kalitlar juftligi: pochta serveri xatlarni yopiq kalit bilan imzolaydi, domen egasi esa ochiq kalitni DNS da o'zi tanlagan nom — selektor ostida e'lon qiladi. Kalitni e'lon qilish va xatlarni imzolash — har xil ishlar, ikkinchisi DNS orqali tekshirilmaydi.",
  },
  "email.dkim.key.fail.revoked": {
    title: "DKIM kaliti bekor qilingan",
    fact: "Selektor {selector}: p tegi qiymatsiz",
    explanation:
      "RFC 6376 bo'yicha qiymatsiz p tegi kalit egasi tomonidan bekor qilinganini bildiradi.",
    impact: "Tekshiruvchi tomon bu kalit bilan qo'yilgan imzolarni haqiqiy deb hisoblamaydi.",
    recommendation:
      "Bu selektor ostida ishlaydigan kalitni e'lon qiling yoki yozuvni olib tashlang.",
  },
  "email.dkim.key.fail.short": {
    title: "DKIM kaliti {limit} bitdan qisqa",
    fact: "Selektor {selector}: {bits} bit",
    explanation:
      "RFC 8301 RFC 6376 ni yangilaydi va tekshiruvchi tomonga {limit} bitdan qisqa RSA kalitlari bilan qo'yilgan imzolarni haqiqiy deb hisoblashni taqiqlaydi.",
    impact: "Tekshiruvchi tomon bu kalit bilan qo'yilgan imzolarni haqiqiy deb hisoblamaydi.",
    recommendation:
      "Kalitni 2048 bit uzunlikda qayta chiqaring va o'sha selektor ostida e'lon qiling.",
  },
  "email.dkim.key.fail.sha1": {
    title: "DKIM kaliti faqat sha1 ga ruxsat beradi",
    fact: "Selektor {selector}: h tegida yolg'iz sha1 bor",
    explanation: "RFC 8301 rsa-sha1 ni imzolashda ham, tekshirishda ham taqiqlaydi.",
    impact: "Tekshiruvchi tomon bu kalit bo'yicha qo'yilgan imzolarni haqiqiy deb hisoblamaydi.",
    recommendation: "h tegini olib tashlang yoki unda sha256 ni ko'rsating.",
  },
  "email.dkim.key.fail.testing": {
    title: "DKIM kaliti sinov kaliti deb e'lon qilingan",
    fact: "Selektor {selector}: t tegida y bor",
    explanation:
      "RFC 6376 bo'yicha t=y bayrog'i qabul qiluvchidan domenga xat imzolanmagandek munosabatda bo'lishni so'raydi.",
    impact: "Qabul qiluvchi imzo tekshiruvi natijasini xatga qo'llamaydi.",
    recommendation: "Imzolash sozlamasi tugagach, t tegidan y qiymatini olib tashlang.",
  },
  "email.dkim.key.fail.unreadable": {
    title: "DKIM yozuvi o'qilmaydi",
    fact: "Selektor {selector}",
    explanation: "Yozuvda kalitli p tegi yo'q yoki v tegida DKIM1 dan boshqa qiymat turibdi.",
    impact: "Tekshiruvchi tomonda yozuvdan imzoni tekshirish uchun oladigan narsa yo'q.",
    recommendation: "v=DKIM1; k=rsa; p=<ochiq kalit> ko'rinishidagi yozuvni e'lon qiling.",
  },
  "email.dkim.key.fail.absent": {
    title: "Ko'rsatilgan selektor ostida yozuv yo'q",
    fact: "Sinab ko'rilgan selektor: {selector}",
    explanation:
      "Bu selektorning _domainkey ostidagi nomi so'raldi. Bu domenning boshqa selektorlari haqida hech narsa demaydi.",
    impact: "Bu nom ostida tekshiruvchi tomon kalitga yeta olmaydi.",
    recommendation: "Selektor yozilishini tekshiring yoki uni pochta xizmati sozlamalaridan oling.",
  },
  "email.dkim.key.unknown.selector": {
    title: "Sinab ko'rilgan nomlar ostida DKIM kaliti topilmadi",
    fact: "Sinab ko'rilgan selektorlar: {selectors}",
    explanation:
      "Selektorni domen egasi tanlaydi va DNS dan qaysi selektorlar borligini so'rab bo'lmaydi: nomni faqat oldindan bilgan holda so'rash mumkin. Bu domenda DKIM yo'q degani emas. Agar selektor ma'lum bo'lsa, uni domen yoniga kiriting.",
  },
  "email.dkim.key.unknown.nothing": {
    title: "DKIM selektori noma'lum",
    explanation:
      "Selektorni domen egasi tanlaydi va DNS dan qaysi selektorlar borligini so'rab bo'lmaydi. MX yozuvlari biz taniydigan pochta xizmatini atamadi, selektor ham kiritilmadi — so'raydigan narsa yo'q. Agar selektor ma'lum bo'lsa, uni domen yoniga kiriting.",
  },
  "email.dkim.key.unknown.lookup": {
    title: "DKIM yozuvini olish imkoni bo'lmadi",
    fact: "Sinab ko'rilgan selektorlar: {selectors}",
    explanation: "TXT so'rovi aniq natija bermadi. Bu kalit yo'q degani emas.",
  },

  "email.starttls.encryption.pass": {
    title: "Qabul qiluvchi serverlar shifrlashni taklif qiladi",
    fact: "Shifrlash o'rnatilgan tugunlar: {hosts}",
    explanation:
      "STARTTLS — server sessiyani shifrlashga o'tkazishni taklif qiladigan SMTP kengaytmasi. Qabul qiluvchi serverga qadar bo'lgan qism shifrlanadi, xatning butun yo'li emas.",
  },
  "email.starttls.encryption.pass.partial": {
    title: "So'rov yuborilgan barcha serverlar shifrlashni taklif qiladi",
    fact: "So'rov yuborilgan tugunlar: {probed}, yuborilmagan: {skipped}",
    explanation:
      "Afzallik tartibidagi birinchi tugunlarga so'rov yuborildi; qolganlari bu safar tekshirilmadi va natija ularga taalluqli emas.",
  },
  "email.starttls.encryption.fail.some": {
    title: "Serverlarning bir qismi shifrlashni taklif qilmaydi",
    fact: "Shifrlashsiz: {hosts}",
    explanation:
      "STARTTLS — server sessiyani shifrlashga o'tkazishni taklif qiladigan SMTP kengaytmasi. Bunday tugunga tushgan jo'natuvchi xatni ochiq holda uzatadi.",
    impact: "Bu tugunga qadar bo'lgan qism shifrlanmaydi.",
    recommendation: "Sanab o'tilgan tugunlarda STARTTLS ni yoqing.",
  },
  "email.starttls.encryption.fail.none": {
    title: "So'rov yuborilgan hech bir server shifrlashni taklif qilmaydi",
    fact: "Shifrlashsiz: {hosts}",
    explanation:
      "STARTTLS — server sessiyani shifrlashga o'tkazishni taklif qiladigan SMTP kengaytmasi. So'rov yuborilgan tugunlarning hech biri uni e'lon qilmadi.",
    impact: "Qabul qiluvchi serverga qadar bo'lgan qism shifrlanmaydi.",
    recommendation: "Domenning qabul qiluvchi tugunlarida STARTTLS ni yoqing.",
  },
  "email.starttls.encryption.fail.upgrade": {
    title: "Shifrlash taklif qilinadi, lekin o'rnatilmaydi",
    fact: "Tugunlar: {hosts}",
    explanation:
      "Server STARTTLS ni e'lon qildi, lekin shifrlashga o'tish tugamadi: qo'l siqish amalga oshmadi.",
    impact: "E'longa ishongan jo'natuvchi shifrlangan qismni olmaydi.",
    recommendation: "Qabul qiluvchi tugunda sertifikat va TLS sozlamasini tekshiring.",
  },
  "email.starttls.encryption.unknown.unavailable": {
    title: "2check bu o'rnatmada shifrlashni tekshirmaydi",
    explanation:
      "Bu yerda pochta portiga chiquvchi ulanishlar mavjud emas. Bu domen xususiyati emas, xizmat cheklovi va domen bahosini kamaytirmaydi.",
  },
  "email.starttls.encryption.unknown.own": {
    title: "2check o'z serverlarini tekshirmaydi",
    explanation:
      "Tugun xizmatning o'z infratuzilmasiga tegishli. 2check o'zini tashqaridan kuzata olmaydi, shuning uchun natija yo'q. Bu domen xususiyati emas, xizmat cheklovi.",
  },
  "email.starttls.encryption.unknown.blocked": {
    title: "Tugunga ulanishga xavfsizlik tekshiruvi ruxsat bermadi",
    explanation:
      "Tugun manzillari 2check har qanday chiquvchi ulanishdan oldin bajaradigan tekshiruvdan o'tmadi. Bu domen haqidagi xulosa emas, xizmat cheklovi.",
  },
  "email.starttls.encryption.unknown.connect": {
    title: "Qabul qiluvchi serverga ulanish imkoni bo'lmadi",
    fact: "So'rov yuborilgan tugunlar: {probed}, yuborilmagan: {skipped}",
    explanation:
      "Ulanish o'rnatilmadi, shuning uchun bu tugundagi shifrlash haqida hech narsa ma'lum emas. Bu shifrlash yo'q degani emas.",
  },
  "email.starttls.encryption.unknown.incomplete": {
    title: "Sessiya shifrlash haqidagi javobdan oldin uzildi",
    fact: "So'rov yuborilgan tugunlar: {probed}, yuborilmagan: {skipped}",
    explanation:
      "Server javob berdi, lekin sessiya STARTTLS haqida ma'lum bo'lishidan oldin tugadi. Bu shifrlash yo'q degani emas.",
  },
  "email.starttls.encryption.blocked": { title: "Shifrlash tekshirilmadi" },
  "email.starttls.certificate.pass": {
    title: "Qabul qiluvchi server sertifikati tartibda",
    fact: "Tugun {host}, chiqargan: {issuer}",
    explanation:
      "Amal qilish muddati, tugun nomiga muvofiqligi va ishonch zanjiri tekshirildi. Sertifikat bo'yicha jo'natuvchi ulanishni qabul qiladimi — aniqlab bo'lmaydi.",
  },
  "email.starttls.certificate.fail.expired": {
    title: "Qabul qiluvchi server sertifikati muddati tugagan",
    fact: "Tugun {host}",
    explanation: "Sertifikatning amal qilish muddati tugadi.",
    impact: "Sertifikatni tekshiradigan jo'natuvchilar bunday ulanishni qabul qilmaydi.",
    recommendation: "Bu tugunda sertifikatni qayta chiqaring.",
  },
  "email.starttls.certificate.fail.early": {
    title: "Qabul qiluvchi server sertifikati hali amal qilmaydi",
    fact: "Tugun {host}",
    explanation: "Sertifikatning amal qilish muddati hali boshlanmagan.",
    impact: "Sertifikatni tekshiradigan jo'natuvchilar bunday ulanishni qabul qilmaydi.",
    recommendation: "Sertifikatning boshlanish sanasi va tugundagi soatni tekshiring.",
  },
  "email.starttls.certificate.fail.hostname": {
    title: "Sertifikat bu tugun nomiga chiqarilmagan",
    fact: "Tugun {host}",
    explanation: "Sertifikat nomlari orasida tugun nomi yo'q.",
    impact: "Nomni solishtiradigan jo'natuvchilar bunday ulanishni qabul qilmaydi.",
    recommendation: "Tugun nomini sertifikatga qo'shing yoki shu nomga sertifikat chiqaring.",
  },
  "email.starttls.certificate.fail.untrusted": {
    title: "Sertifikatning ishonch zanjiri qurilmaydi",
    fact: "Tugun {host}",
    explanation: "Sertifikat ishonchli ildizgacha ko'tarilmaydi.",
    impact: "Zanjirni tekshiradigan jo'natuvchilar bunday ulanishni qabul qilmaydi.",
    recommendation: "Tugunga chiqaruvchining oraliq sertifikatlarini o'rnating.",
  },
  "email.starttls.certificate.unknown": {
    title: "Ishonch zanjiri tekshirilmadi",
    fact: "Tugun {host}",
    explanation:
      "Tekshiruv zanjirgacha to'xtadi, shuning uchun ishonch haqida xulosa chiqmadi. Bu ishonchsiz sertifikat bilan bir xil emas.",
  },
  "email.starttls.certificate.blocked": {
    title: "Qabul qiluvchi server sertifikati tekshirilmadi",
  },

  "category.email": { title: "Pochta" },
  "category.dns": { title: "DNS" },
  "category.registry": { title: "Domen" },
  "category.tls": { title: "SSL/TLS" },

  "confidence.HIGH": { title: "Yuqori ishonch" },
  "confidence.REDUCED": { title: "Pasaytirilgan ishonch" },

  "web.error.request_invalid": { title: "So'rovni o'qib bo'lmadi" },
  "web.error.scan_scope_invalid": { title: "Tekshiruvlarning bunday birikmasi mumkin emas" },
  "web.error.scan_scope_not_available": {
    title: "Bu o'rnatma so'ralgan tekshiruvlarni hozircha bajara olmaydi",
  },
  "web.error.scan_not_found": { title: "Bu tekshiruv noma'lum yoki saqlash muddati tugagan" },
  "web.error.rate_limited": {
    title: "Ketma-ket juda ko'p tekshiruv",
    explanation:
      "2check bitta serverda ishlaydi va boshqalarning ommaviy xizmatlariga murojaat qiladi, shuning uchun bitta manzildan tekshiruvlar soni cheklangan.",
    recommendation: "Bir daqiqa kuting va qayta urinib ko'ring.",
  },
  "web.error.service_unavailable": {
    title: "Xizmat hozircha tekshiruvlarni qabul qilmayapti",
    explanation: "Xizmat nusxasi ishga tayyor emas, shuning uchun yangi tekshiruv boshlanmaydi.",
    recommendation: "Bir necha daqiqadan keyin qayta urinib ko'ring.",
  },
  "web.error.service_busy": {
    title: "Xizmat hozir band",
    explanation: "Bir vaqtning o'zida server ko'tara oladigan darajada tekshiruv bajarilmoqda.",
    recommendation: "Bir necha soniyadan keyin qayta urinib ko'ring.",
  },
  "web.error.gated_access_denied": { title: "Bu ma'lumotlarga ruxsat yo'q" },
  "web.error.input_empty": { title: "Domenni kiriting" },
  "web.error.input_scheme_unsupported": { title: "Faqat http va https manzillari qabul qilinadi" },
  "web.error.input_credentials_present": { title: "Manzildan hisob ma'lumotlarini olib tashlang" },
  "web.error.input_port_not_allowed": { title: "Nostandart port qo'llab-quvvatlanmaydi" },
  "web.error.input_ip_address": {
    title: "IP-manzil emas, domen nomini kiriting",
    explanation:
      "2check nomga tegishli narsalarni tekshiradi: DNS yozuvlari, zonada ro'yxatdan o'tish va shu nom uchun taqdim etilgan sertifikat. Manzilning o'zida bularning hech biri yo'q.",
    recommendation: "Shu manzilga ishora qiluvchi nomni kiriting, masalan example.uz.",
  },
  "web.error.input_wildcard_hostname": {
    title: "O'rniga qo'yish belgisi bilan nomni tekshirib bo'lmaydi",
  },
  "web.error.input_email_address": { title: "Pochta manzili emas, domen nomini kiriting" },
  "web.error.input_single_label": { title: "To'liq domen nomini kiriting, masalan example.uz" },
  "web.error.input_reserved_hostname": { title: "Bu zahiradagi nom, uni tekshirib bo'lmaydi" },
  "web.error.input_hostname_invalid": { title: "Bu domen nomiga o'xshamaydi" },
};
