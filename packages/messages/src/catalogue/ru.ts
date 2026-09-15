import type { Catalogue } from "../types.js";

/**
 * PRD 13.2 — факт, затем последствие, затем рекомендация, причём два последних только там, где
 * данные это подтверждают. PRD 13.5 — никаких недоказанных причинных связей: расхождение
 * резолверов описывается как расхождение, а NXDOMAIN не описывается как «домен свободен».
 */
export const ru: Catalogue = {
  "dns.name.existence.pass": { title: "Имя существует в DNS" },
  "dns.name.existence.fail": {
    title: "Имя не существует в DNS",
    explanation: "Резолверы согласны, что такого имени в зоне нет.",
    impact: "Ничто, что опирается на это имя, работать не может: ни сайт, ни почта, ни сертификат.",
    recommendation: "Проверьте написание, делегирование домена и опубликована ли зона.",
  },
  "dns.name.existence.unknown": {
    title: "Не удалось определить, существует ли имя",
    explanation: "Слишком мало резолверов дали пригодный ответ, чтобы сделать вывод.",
  },

  "dns.record.resolve.present": { title: "Записи {recordType} найдены" },
  "dns.record.resolve.absent": { title: "Запись {recordType} не обнаружена" },
  "dns.record.resolve.name_not_found": {
    title: "Имя не существует, поэтому {recordType} не оценивалась",
  },
  "dns.record.resolve.unknown": {
    title: "Не удалось проверить запись {recordType}",
    explanation: "Резолверы не дали достаточного числа согласованных ответов.",
  },

  "dns.record.consistency.pass": { title: "Резолверы согласны по {recordType}" },
  "dns.record.consistency.fail": {
    title: "Резолверы расходятся по {recordType}",
    explanation: "Одни резолверы видят запись, другие нет.",
    impact: "Посетители могут получать разные ответы в зависимости от используемого резолвера.",
    recommendation: "Сверьте зону на всех авторитетных серверах и проверьте недавние изменения.",
  },

  "registry.lookup.registered": { title: "Домен зарегистрирован" },
  "registry.lookup.not_registered": {
    title: "Реестр сообщает, что домен не зарегистрирован",
    explanation: "Авторитетная служба реестра подтвердила отсутствие регистрации.",
  },
  "registry.lookup.indeterminate": {
    title: "Не удалось получить данные о регистрации",
    explanation:
      "Служба реестра не вернула пригодного ответа. Это ничего не говорит о том, зарегистрирован домен или нет.",
  },
  "registry.lookup.provider_not_supported": {
    title: "2check не проверяет регистрацию в этой зоне",
    explanation:
      "Проверка регистрации сейчас охватывает только зону .uz. Это ограничение сервиса, а не проблема домена.",
  },

  "tls.connection.pass": { title: "Соединение по {ipFamily} установлено, протокол {protocol}" },
  "tls.connection.fail": {
    title: "Не удалось установить TLS-соединение по {ipFamily}",
    explanation: "Адрес ответил, но соединение или рукопожатие не завершилось.",
    impact: "Браузеры, приходящие по {ipFamily}, не смогут открыть сайт защищённо.",
    recommendation: "Проверьте, что на этом адресе обслуживается порт 443 и служба TLS запущена.",
  },
  "tls.connection.unknown": {
    title: "Не удалось проверить TLS-соединение по {ipFamily}",
    explanation: "Проверка не завершилась на нашей стороне, о цели ничего не наблюдалось.",
  },
  "tls.connection.not_applicable": { title: "Адреса {ipFamily} нет, подключаться не к чему" },

  "tls.certificate.validity.pass": { title: "Сертификат действует" },
  "tls.certificate.validity.fail": {
    title: "Сертификат вне срока действия",
    explanation: "Срок сертификата истёк или ещё не начался.",
    impact: "Браузеры показывают предупреждение, и большинство посетителей не пойдут дальше.",
    recommendation: "Перевыпустите или продлите сертификат и перезагрузите службу TLS.",
  },
  "tls.certificate.validity.blocked": { title: "Сертификат не оценивался" },

  "tls.certificate.hostname.pass": { title: "Сертификат покрывает это имя хоста" },
  "tls.certificate.hostname.fail": {
    title: "Сертификат не покрывает это имя хоста",
    explanation: "Имени нет среди альтернативных имён субъекта в сертификате.",
    impact: "Браузеры показывают предупреждение о несовпадении имени.",
    recommendation: "Перевыпустите сертификат, включив в него это имя.",
  },
  "tls.certificate.hostname.blocked": { title: "Соответствие имени не оценивалось" },

  "tls.certificate.chain.pass": { title: "Цепочка сертификатов доверенная" },
  "tls.certificate.chain.fail": {
    title: "Цепочка сертификатов недоверенная",
    explanation:
      "Цепочка самоподписанная или не выстраивается до доверенного корня по тем сертификатам, что отдал сервер.",
    impact: "Клиенты, которые не доверяют этой цепочке заранее, откажутся от соединения.",
    recommendation: "Отдавайте полную цепочку, включая промежуточные сертификаты.",
  },
  "tls.certificate.chain.blocked": { title: "Цепочка сертификатов не оценивалась" },

  "verdict.HEALTHY": { title: "Проблем не найдено" },
  "verdict.RECOMMENDATIONS": { title: "Есть рекомендации" },
  "verdict.PROBLEMS": { title: "Найдены проблемы" },
  "verdict.CRITICAL_PROBLEM": { title: "Критическая проблема" },
  "verdict.NO_CONFIRMED_ISSUES_INCOMPLETE": {
    title: "Подтверждённых проблем нет, но картина неполная",
    explanation:
      "Часть проверок не удалось завершить, поэтому это не заключение о полном здоровье.",
  },

  "category.dns": { title: "DNS" },
  "category.registry": { title: "Домен" },
  "category.tls": { title: "SSL/TLS" },

  "confidence.HIGH": { title: "Высокая уверенность" },
  "confidence.REDUCED": { title: "Сниженная уверенность" },

  "web.error.request_invalid": { title: "Не удалось прочитать запрос" },
  "web.error.scan_scope_invalid": { title: "Такое сочетание проверок недопустимо" },
  "web.error.scan_scope_not_available": {
    title: "Эта установка пока не выполняет запрошенные проверки",
  },
  "web.error.gated_access_denied": { title: "Доступ к этим данным не предоставлен" },
  "web.error.scan_not_found": { title: "Сканирование неизвестно или срок его хранения истёк" },
  "web.error.input_empty": { title: "Введите домен" },
  "web.error.input_scheme_unsupported": { title: "Принимаются только адреса http и https" },
  "web.error.input_credentials_present": { title: "Уберите учётные данные из адреса" },
  "web.error.input_port_not_allowed": { title: "Нестандартный порт не поддерживается" },
  "web.error.input_ip_address": { title: "Введите доменное имя, а не IP-адрес" },
  "web.error.input_wildcard_hostname": { title: "Имя с подстановочным знаком проверить нельзя" },
  "web.error.input_email_address": { title: "Введите доменное имя, а не адрес почты" },
  "web.error.input_single_label": { title: "Введите полное доменное имя, например example.uz" },
  "web.error.input_reserved_hostname": { title: "Это зарезервированное имя, его нельзя проверить" },
  "web.error.input_hostname_invalid": { title: "Это не похоже на доменное имя" },
};
