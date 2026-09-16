/**
 * PRD 8.3 and 13.5 — reading the services a domain's records point at.
 *
 * MX records say where mail is delivered and TXT records carry the tokens other services ask to
 * be published. Both are public facts about the zone, and a reader who is shown
 * "10 aspmx.l.google.com" usually wanted "the mail goes to Google Workspace".
 *
 * The rule this module is written under is PRD 13.5: no unproven causal claim. A match says
 * where a record points, not what an organisation uses, buys or runs. A verification token can
 * outlive the service that asked for it by years, so the wording everywhere downstream is about
 * the record, never about the company — and a name that is not in the table simply goes
 * unrecognised rather than being guessed at.
 *
 * Names are proper nouns and are the same in every language, so they need no catalogue entry.
 */

export type ServiceKind = "mail" | "sender" | "verification";

export interface RecognisedService {
  readonly name: string;
  readonly kind: ServiceKind;
}

interface Rule {
  readonly name: string;
  readonly kind: ServiceKind;
  /** Matched against a lowercased record value. */
  readonly needles: readonly string[];
}

/**
 * Mail exchangers, matched on the host the record points at. Ordered from the specific to the
 * general, because the first match wins and some suffixes contain others.
 */
const MAIL_RULES: readonly Rule[] = [
  {
    name: "Google Workspace",
    kind: "mail",
    needles: ["aspmx.l.google.com", ".googlemail.com", "aspmx.google.com"],
  },
  {
    name: "Microsoft 365",
    kind: "mail",
    needles: [".mail.protection.outlook.com", ".protection.outlook.com"],
  },
  {
    name: "Yandex 360",
    kind: "mail",
    needles: ["mx.yandex.net", "mx.yandex.ru", ".mail.yandex.net"],
  },
  { name: "VK WorkMail", kind: "mail", needles: ["emx.mail.ru", "mxs.mail.ru", ".mail.ru"] },
  { name: "Zoho Mail", kind: "mail", needles: [".zoho.com", ".zoho.eu", ".zohomail."] },
  { name: "Proofpoint", kind: "mail", needles: [".pphosted.com", ".ppe-hosted.com"] },
  { name: "Mimecast", kind: "mail", needles: [".mimecast.com"] },
  { name: "Barracuda", kind: "mail", needles: [".barracudanetworks.com"] },
  { name: "Cisco Secure Email", kind: "mail", needles: [".iphmx.com"] },
  { name: "Amazon WorkMail", kind: "mail", needles: ["inbound-smtp.", ".awsapps.com"] },
  { name: "Fastmail", kind: "mail", needles: [".messagingengine.com", ".fastmail.com"] },
  { name: "iCloud Mail", kind: "mail", needles: [".icloud.com", ".mail.me.com"] },
  { name: "Migadu", kind: "mail", needles: [".migadu.com"] },
  { name: "ImprovMX", kind: "mail", needles: [".improvmx.com"] },
  { name: "Tencent Exmail", kind: "mail", needles: [".qq.com"] },
  { name: "Mail.Biz / cPanel", kind: "mail", needles: [".mailspamprotection.com"] },
  { name: "Hostinger", kind: "mail", needles: [".hostinger.com", "mx1.hostinger"] },
  { name: "Timeweb", kind: "mail", needles: [".timeweb.ru"] },
  { name: "Beget", kind: "mail", needles: [".beget.com", ".beget.ru"] },
  { name: "REG.RU", kind: "mail", needles: [".reg.ru"] },
];

/** Senders declared in SPF, and the tokens services ask a domain to publish. */
const TXT_RULES: readonly Rule[] = [
  { name: "Google Workspace", kind: "sender", needles: ["include:_spf.google.com"] },
  { name: "Microsoft 365", kind: "sender", needles: ["include:spf.protection.outlook.com"] },
  { name: "Yandex 360", kind: "sender", needles: ["include:_spf.yandex.net"] },
  { name: "VK WorkMail", kind: "sender", needles: ["include:_spf.mail.ru", "include:spf.mail.ru"] },
  { name: "Amazon SES", kind: "sender", needles: ["include:amazonses.com"] },
  { name: "SendGrid", kind: "sender", needles: ["include:sendgrid.net"] },
  { name: "Mailgun", kind: "sender", needles: ["include:mailgun.org", "include:_spf.mailgun.org"] },
  {
    name: "Mailchimp",
    kind: "sender",
    needles: ["include:servers.mcsv.net", "include:spf.mandrillapp.com"],
  },
  { name: "Zendesk", kind: "sender", needles: ["include:mail.zendesk.com"] },
  {
    name: "HubSpot",
    kind: "sender",
    needles: ["include:_spf.hubspot.net", "include:spf.hubspotemail.net"],
  },
  { name: "Salesforce", kind: "sender", needles: ["include:_spf.salesforce.com"] },
  { name: "Postmark", kind: "sender", needles: ["include:spf.mtasv.net"] },
  { name: "SparkPost", kind: "sender", needles: ["include:sparkpostmail.com"] },
  { name: "Intercom", kind: "sender", needles: ["include:_spf.intercom.io"] },
  { name: "Klaviyo", kind: "sender", needles: ["include:_spf.klaviyo.com"] },
  {
    name: "Brevo",
    kind: "sender",
    needles: ["include:spf.sendinblue.com", "include:spf.brevo.com"],
  },
  {
    name: "UniSender",
    kind: "sender",
    needles: ["include:spf.unisender.com", "include:_spf.unisender.com"],
  },
  { name: "SendPulse", kind: "sender", needles: ["include:spf.sendpulse.com"] },
  { name: "Zoho", kind: "sender", needles: ["include:zoho.com", "include:zohomail.com"] },
  { name: "Atlassian", kind: "sender", needles: ["include:_spf.atlassian.net"] },

  { name: "Google Search Console", kind: "verification", needles: ["google-site-verification="] },
  { name: "Yandex Webmaster", kind: "verification", needles: ["yandex-verification"] },
  { name: "Microsoft 365", kind: "verification", needles: ["ms=ms"] },
  {
    name: "Meta",
    kind: "verification",
    needles: ["facebook-domain-verification=", "workplace-domain-verification="],
  },
  { name: "Apple", kind: "verification", needles: ["apple-domain-verification="] },
  { name: "Atlassian", kind: "verification", needles: ["atlassian-domain-verification="] },
  { name: "Zoom", kind: "verification", needles: ["zoom_verify_", "zoom-domain-verification="] },
  { name: "Slack", kind: "verification", needles: ["slack-domain-verification="] },
  { name: "Dropbox", kind: "verification", needles: ["dropbox-domain-verification="] },
  { name: "Notion", kind: "verification", needles: ["notion-domain-verification="] },
  { name: "Miro", kind: "verification", needles: ["miro-verification="] },
  { name: "Canva", kind: "verification", needles: ["canva-site-verification="] },
  {
    name: "Adobe",
    kind: "verification",
    needles: ["adobe-idp-site-verification=", "adobe-sign-verification="],
  },
  { name: "DocuSign", kind: "verification", needles: ["docusign="] },
  { name: "Stripe", kind: "verification", needles: ["stripe-verification="] },
  { name: "OpenAI", kind: "verification", needles: ["openai-domain-verification="] },
  { name: "Jamf", kind: "verification", needles: ["jamf-site-verification="] },
  { name: "TeamViewer", kind: "verification", needles: ["teamviewer-sso-verification="] },
  { name: "DataDome", kind: "verification", needles: ["datadome-domain-verify="] },
  { name: "Shopify", kind: "verification", needles: ["shopify-verification="] },
  { name: "Wix", kind: "verification", needles: ["wix-domain-verification="] },
  { name: "Lovable", kind: "verification", needles: ["lovable_verification="] },
  { name: "Citrix", kind: "verification", needles: ["citrix-verification-code="] },
  { name: "LogMeIn", kind: "verification", needles: ["logmein-verification-code="] },
  { name: "MongoDB", kind: "verification", needles: ["mongodb-site-verification="] },
];

/** An MX answer is "10 mx.example.net"; the priority is not part of the host. */
function mailHost(value: string): string {
  return (value.trim().split(/\s+/).at(-1) ?? value).toLowerCase().replace(/\.$/, "");
}

function matches(rule: Rule, haystack: string): boolean {
  return rule.needles.some((needle) => haystack.includes(needle));
}

/**
 * Where the domain's mail is delivered, when the exchangers name a service we know.
 *
 * One answer, not a list: a zone points its MX at one mail service and lists several hosts of it,
 * so naming each one would repeat the same finding. A zone that genuinely splits delivery across
 * two services is rare enough to report as the first one recognised rather than to model.
 */
export function recogniseMailProvider(values: readonly string[]): RecognisedService | undefined {
  const hosts = values.map(mailHost);
  for (const rule of MAIL_RULES) {
    if (hosts.some((host) => matches(rule, host))) {
      return { name: rule.name, kind: rule.kind };
    }
  }
  return undefined;
}

/**
 * The services named by TXT records: who may send mail as the domain, and who asked for a token
 * to be published. Deduplicated by name and kind, in table order, so the same list comes back
 * whatever order the resolvers answered in.
 */
export function recogniseTxtServices(values: readonly string[]): readonly RecognisedService[] {
  const haystack = values.map((value) => value.toLowerCase());
  const found: RecognisedService[] = [];
  for (const rule of TXT_RULES) {
    if (haystack.some((value) => matches(rule, value))) {
      found.push({ name: rule.name, kind: rule.kind });
    }
  }
  return found;
}

/** Everything the records of one type say, across every resolver that answered. */
export function recogniseServices(
  qtype: string,
  answersByProvider: Readonly<Record<string, readonly string[]>>,
): readonly RecognisedService[] {
  const values = [...new Set(Object.values(answersByProvider).flat())];
  if (values.length === 0) {
    return [];
  }
  if (qtype === "MX") {
    const provider = recogniseMailProvider(values);
    return provider === undefined ? [] : [provider];
  }
  if (qtype === "TXT") {
    return recogniseTxtServices(values);
  }
  return [];
}
