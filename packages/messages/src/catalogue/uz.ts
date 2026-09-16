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
    title: "{recordType} yozuvini tekshirib bo'lmadi",
    explanation: "Rezolverlar yetarlicha mos javob bermadi.",
  },

  "dns.record.consistency.pass": {
    title: "Rezolverlar {recordType} bo'yicha bir xil javob berdi",
    explanation:
      "Biz bir nechta mustaqil ommaviy rezolverdan so'raymiz. Javoblar bir xil bo'lsa, o'zgarish tarqalgan va tashrifchilar qaysi provayderdan foydalanishidan qat'i nazar bir xil natijani ko'radi.",
  },
  "dns.record.consistency.fail": {
    title: "Rezolverlar {recordType} bo'yicha turlicha javob berdi",
    explanation: "Ba'zi rezolverlar yozuvni ko'radi, ba'zilari ko'rmaydi.",
    impact: "Tashrifchilar qaysi rezolverdan foydalanishiga qarab turlicha javob olishi mumkin.",
    recommendation:
      "Zonani barcha vakolatli serverlarda solishtiring va so'nggi o'zgarishlarni tekshiring.",
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
