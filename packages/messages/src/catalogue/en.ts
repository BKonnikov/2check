import type { Catalogue } from "../types.js";

/**
 * PRD 13.2 — fact, then impact, then recommendation, and the last two only where the data
 * supports them. PRD 13.5 — no unproven causation: a resolver disagreement is reported as a
 * disagreement, not as "DNS propagation"; NXDOMAIN is not reported as "available to buy".
 */
export const en: Catalogue = {
  "dns.name.existence.pass": {
    title: "The name exists in DNS",
    explanation:
      "Public resolvers know this name. That does not yet mean the site opens — only that DNS has it.",
  },
  "dns.name.existence.fail": {
    title: "The name does not exist in DNS",
    explanation: "The resolvers agree that this name is not registered in the DNS zone.",
    impact: "Nothing that relies on this name can work: no site, no mail, no certificate.",
    recommendation:
      "Check the spelling, and whether the domain is delegated and the zone published.",
  },
  "dns.name.existence.unknown": {
    title: "Could not determine whether the name exists",
    explanation: "Too few resolvers gave a usable answer to decide.",
  },

  "dns.record.resolve.present": { title: "{recordType} records were found" },
  "dns.record.resolve.present.mail": {
    title: "Mail for this domain is delivered to {service}",
    explanation:
      "MX records say where mail for a domain is delivered, and these point at {service}. That is a reading of the records, not a claim about what the organisation uses: records can outlive the arrangement that created them.",
  },
  "dns.record.resolve.absent": { title: "No {recordType} record was found" },
  "dns.record.resolve.name_not_found": {
    title: "The name does not exist, so {recordType} was not evaluated",
  },
  "dns.record.resolve.unknown": {
    title: "The resolvers did not agree about {recordType}",
    explanation:
      "There were not enough answers in agreement to draw a conclusion. Just after a zone is changed this is ordinary: some resolvers still hold the previous answer and will hold it until their cache expires.",
  },
  "dns.record.resolve.unknown.split": {
    title: "The resolvers did not agree about {recordType}",
    fact: "See the record: {seeing}. Do not: {missing}",
    explanation:
      "There were not enough answers in agreement to draw a conclusion. Just after a zone is changed this is ordinary: some resolvers still hold the previous answer and will hold it until their cache expires.",
  },

  "dns.record.consistency.pass": {
    title: "The resolvers agree about {recordType}",
    explanation:
      "We ask several independent public resolvers. The same answer from all of them means the change has propagated and visitors see the same thing whichever provider they use.",
  },
  "dns.record.consistency.fail": {
    title: "The resolvers disagree about {recordType}",
    fact: "See the record: {seeing}. Do not: {missing}",
    explanation:
      "Some resolvers see the record and others do not. Most often this is a recent change to the zone that has not reached every cache yet; less often, the authoritative servers themselves differ.",
    impact: "Visitors may get different answers depending on which resolver they use.",
    recommendation:
      "If the record was added or changed recently, wait a few minutes and run the check again. If the split persists, compare the zone on every authoritative server.",
  },

  "registry.lookup.registered": {
    title: "The domain is registered",
    explanation: "The registry for this zone confirms the registration.",
  },
  "registry.lookup.registered.registrar": {
    title: "The domain is registered through {registrar}",
    explanation:
      "The registrar is the company the domain is paid and renewed through. The registry returned no dates in this answer.",
  },
  "registry.lookup.registered.record": {
    title: "The domain is registered through {registrar}",
    fact: "Registered {createdAt} · paid up to {expiresAt}",
    explanation:
      "The registry record was created on {createdAt} and is paid up to {expiresAt}. The registrar is the company the domain is renewed through — the one to contact to change name servers or extend the term. Name servers and record status are in the technical detail.",
  },
  "registry.lookup.not_registered": {
    title: "The registry reports the domain as not registered",
    explanation: "The authoritative registry service confirmed there is no registration.",
  },
  "registry.lookup.indeterminate": {
    title: "Could not retrieve the registration data",
    explanation:
      "The registry service did not return a usable answer. This says nothing about whether the domain is registered.",
  },
  "registry.lookup.provider_not_supported": {
    title: "2check does not check registration for this zone",
    explanation:
      "Registration lookup currently covers the .uz zone only. This is a limitation of 2check, not a problem with the domain.",
  },

  "tls.connection.pass": {
    title: "Connected over {ipFamily} using {protocol}",
    explanation:
      "We reached port 443 and negotiated a secure channel. The protocol version is what encrypts traffic between browser and server; TLSv1.2 and TLSv1.3 are the current ones.",
  },
  "tls.connection.fail": {
    title: "Could not establish a TLS connection over {ipFamily}",
    explanation: "The connection or the handshake did not complete.",
    impact: "Browsers reaching the site over {ipFamily} cannot open it securely.",
    recommendation:
      "Check that port 443 is served on this address and that the TLS service is running.",
  },
  "tls.connection.fail.timeout": {
    title: "The server did not answer over {ipFamily}",
    explanation:
      "A connection to port 443 was started, but nothing answered before the wait ran out.",
    impact: "Visitors arriving over {ipFamily} will not be able to open the site securely.",
    recommendation: "Check that port 443 is open on this address and not dropped by a firewall.",
  },
  "tls.connection.fail.refused": {
    title: "The server refused the connection over {ipFamily}",
    explanation:
      "The address answered with a refusal: nothing is accepting connections on port 443.",
    impact: "Visitors arriving over {ipFamily} will not be able to open the site securely.",
    recommendation:
      "Check that the TLS service is running and listening on port 443 at this address.",
  },
  "tls.connection.own_infrastructure": {
    title: "This domain is hosted on 2check's own infrastructure",
    explanation:
      "2check does not check its own addresses: looking at itself from inside its own network is not the outside view the service promises, and the result would not be trustworthy. Check this domain's connection and certificate with another tool.",
  },
  "tls.connection.unknown": {
    title: "Could not check the TLS connection over {ipFamily}",
    explanation:
      "The check did not complete on our side, so nothing was observed about the target.",
  },
  "tls.connection.not_applicable": { title: "No {ipFamily} address, so nothing to connect to" },

  "tls.certificate.validity.pass": {
    title: "The certificate is valid for another {daysRemaining} days",
    explanation:
      "Every certificate has a term. Once it ends, browsers stop opening the site without a warning, so renewing well ahead is the safe course.",
  },
  "tls.certificate.validity.fail": {
    title: "The certificate is outside its validity period",
    explanation: "The certificate has expired or is not valid yet.",
    impact: "Browsers show a warning and most visitors will not proceed.",
    recommendation: "Reissue or renew the certificate and reload the TLS service.",
  },
  "tls.certificate.validity.blocked": { title: "The certificate was not evaluated" },

  "tls.certificate.hostname.pass": {
    title: "The certificate covers this hostname",
    explanation:
      "A certificate is issued for a list of names. The name being checked is on that list — either outright or through a wildcard such as *.example.uz.",
  },
  "tls.certificate.hostname.fail": {
    title: "The certificate does not cover this hostname",
    explanation: "The hostname is not present among the certificate's subject alternative names.",
    impact: "Browsers show a name mismatch warning.",
    recommendation: "Reissue the certificate with this hostname included.",
  },
  "tls.certificate.hostname.blocked": { title: "The hostname match was not evaluated" },

  "tls.certificate.chain.pass": {
    title: "The certificate chain is trusted",
    explanation:
      "The site's certificate is signed by an intermediate authority, that one by a root, and the root is trusted by the operating system. That sequence of signatures is the chain: it was built all the way, so a browser will accept the certificate without warnings.",
  },
  "tls.certificate.chain.fail": {
    title: "The certificate chain is not trusted",
    explanation:
      "The chain is self-signed or could not be built to a trusted root with the certificates the server sent.",
    impact: "Clients that do not already trust this chain will refuse the connection.",
    recommendation: "Serve the full chain, including the intermediate certificates.",
  },
  "tls.certificate.chain.unknown": {
    title: "Chain trust could not be verified",
    explanation:
      "Verification stopped at another fault in the certificate, so the chain was never reached. This does not mean the chain is faulty.",
  },
  "tls.certificate.chain.blocked": { title: "The certificate chain was not evaluated" },

  "verdict.HEALTHY": { title: "No problems found" },
  "verdict.RECOMMENDATIONS": { title: "There are recommendations" },
  "verdict.PROBLEMS": { title: "Problems found" },
  "verdict.CRITICAL_PROBLEM": { title: "Critical problem" },
  "verdict.NO_CONFIRMED_ISSUES_INCOMPLETE": {
    title: "No confirmed problems, but the picture is incomplete",
    explanation: "Some checks could not be completed, so this is not a clean bill of health.",
  },

  "email.mx.records.present": {
    title: "Receiving servers are named",
    fact: "Usable hosts: {count}",
    explanation:
      "MX records name the servers senders deliver mail for this domain to, in order of preference.",
  },
  "email.mx.records.null": {
    title: "The domain declares that it accepts no mail",
    fact: "An MX record with an empty host is published",
    explanation:
      "RFC 7505 defines such a record as an explicit declaration by the owner. A sender learns of it at once and does not hold the message in a queue.",
  },
  "email.mx.records.fail.implicit": {
    title: "There are no MX records; mail will follow the domain's address records",
    explanation:
      "RFC 5321 has a sender that finds no MX turn to the domain's own address records. The mail does arrive — at the host that answers for the website.",
    impact: "Where mail is delivered is decided by a record that answers a different question.",
    recommendation:
      "Publish MX records if the domain receives mail, or an MX record with an empty host if it does not.",
  },
  "email.mx.records.fail.missing": {
    title: "The domain has neither MX records nor address records",
    explanation: "A sender has nowhere to deliver mail for this domain.",
    impact: "Messages to addresses in this domain will not be delivered.",
    recommendation:
      "Publish MX records if the domain should receive mail, or an MX record with an empty host if it should not.",
  },
  "email.mx.records.fail.unusable": {
    title: "No host in the MX records is usable",
    fact: "Unusable hosts: {count}",
    explanation: "The hosts have no address records, or an address is written in place of a name.",
    impact: "A sender has nowhere to deliver to, although MX records are published.",
    recommendation:
      "Check the host names in the MX records and the address records of those names.",
  },
  "email.mx.records.fail.literal": {
    title: "An MX record holds an address in place of a name",
    fact: "Those records: {hosts}",
    explanation: "The host of an MX record must be a domain name, not an IP address.",
    impact: "Senders do not use such a record.",
    recommendation:
      "Give the server a name, put that in MX, and put the address in an A or AAAA record.",
  },
  "email.mx.records.fail.alias": {
    title: "An MX host is an alias",
    fact: "Those hosts: {hosts}",
    explanation:
      "RFC 2181 requires an MX host to be a name with address records rather than a CNAME alias.",
    impact: "Some senders handle such a record differently from others.",
    recommendation: "Point MX at a name that has address records of its own.",
  },
  "email.mx.records.fail.partial": {
    title: "Some hosts in the MX records are unusable",
    fact: "Without address records: {hosts}",
    explanation: "These names have no A or AAAA records, so nothing can connect to them.",
    impact:
      "Delivery proceeds through the remaining hosts; the redundancy the owner counted on is smaller than it looks.",
    recommendation: "Give these names address records, or remove them from MX.",
  },
  "email.mx.records.unknown": {
    title: "The receiving server could not be determined",
    explanation:
      "The queries gave no definite result. That does not mean there are no records, or that the hosts are unusable.",
  },
  "email.spf.record.present": {
    title: "A sending policy is published",
    fact: "One SPF record",
    explanation:
      "SPF is a DNS record in which a domain's owner lists the servers that send mail in its name.",
  },
  "email.spf.record.fail.absent": {
    title: "No sending policy is published",
    explanation:
      "SPF is a DNS record in which a domain's owner lists the servers that send mail in its name. A receiver checks the address a message came from against it.",
    impact: "A receiver has nothing to check the sending address against.",
    recommendation:
      "Publish a TXT record beginning with v=spf1 and list the servers you send from.",
  },
  "email.spf.record.fail.multiple": {
    title: "There is more than one SPF record",
    fact: "Records found: {count}",
    explanation: "RFC 7208 allows a domain only one SPF record.",
    impact: "A receiver does not pick one of them; it rejects the policy outright.",
    recommendation: "Keep one record and move the contents of the others into it.",
  },
  "email.spf.record.fail.unparseable": {
    title: "The SPF record does not parse",
    explanation: "The record holds a term the RFC 7208 grammar does not admit.",
    impact: "A receiver rejects such a policy outright.",
    recommendation: "Check the record for typos in its mechanisms and modifiers.",
  },
  "email.spf.record.unknown": {
    title: "The SPF record could not be retrieved",
    explanation: "The TXT query gave no definite result. That does not mean there is no record.",
  },
  "email.spf.limits.pass": {
    title: "The record stays inside the traversal limits",
    fact: "Terms causing a DNS query: {count} of {limit}",
  },
  "email.spf.limits.fail.lookups": {
    title: "The record holds more than {limit} terms causing a DNS query",
    fact: "Terms causing a DNS query: {count}",
    explanation:
      "RFC 7208 limits the number of include, a, mx, ptr, exists and redirect terms evaluated in one check, nested records included.",
    impact: "Exceeding the limit produces a record error at the receiver.",
    recommendation:
      "Reduce the number of nested includes, or replace some of them with explicit ip4 and ip6 addresses.",
  },
  "email.spf.limits.fail.void": {
    title: "The record holds more than {limit} names that answer with nothing",
    fact: "Names answering with nothing: {count}",
    explanation:
      "RFC 7208 recommends limiting the number of queries that return an empty answer or a name that does not exist.",
    impact:
      "Receivers honour that recommendation unevenly, so the record behaves differently at different ones.",
    recommendation: "Remove names that no longer exist from the record.",
  },
  "email.spf.limits.fail.loop": {
    title: "The traversal of the record loops",
    fact: "A name was reached twice: {name}",
    explanation: "One of the nested records points back at a name already walked.",
    impact: "A receiver stops evaluating and treats the record as an error.",
    recommendation: "Remove the reference that closes the include or redirect chain.",
  },
  "email.spf.limits.unknown": {
    title: "The traversal of the record did not finish",
    fact: "Terms causing a DNS query walked: {count}",
    explanation:
      "Some nested names could not be followed, so the number of terms is not fully known and no judgement about the limit can be made.",
  },
  "email.spf.limits.blocked": { title: "The traversal limits were not checked" },
  "email.spf.policy.pass.reject": {
    title: "Unlisted senders are rejected",
    fact: "The record ends with -all",
  },
  "email.spf.policy.pass.mark": {
    title: "Unlisted senders are marked",
    fact: "The record ends with ~all",
    explanation:
      "A message from an unlisted address is accepted but marked. This is the working setting for a domain still confirming its list of senders.",
  },
  "email.spf.policy.fail.neutral": {
    title: "The record states nothing about unlisted senders",
    fact: "The record ends with ?all",
    explanation: "The ?all mechanism means the owner set no result for such addresses.",
    impact: "A receiver has nothing to apply to a message from an address the record omits.",
    recommendation: "Replace ?all with ~all or -all once the list of senders is complete.",
  },
  "email.spf.policy.fail.open": {
    title: "The record permits sending from any address",
    fact: "The record ends with +all",
    explanation: "The +all mechanism gives any address a positive SPF result.",
    impact: "The record places no limit on who may send.",
    recommendation: "Replace +all with -all and list the servers you send from explicitly.",
  },
  "email.spf.policy.fail.absent": {
    title: "The record holds neither all nor redirect",
    explanation:
      "Without a final mechanism the record sets no result for addresses it does not list.",
    impact: "A receiver has nothing to apply to a message from such an address.",
    recommendation: "Add -all or ~all to the end of the record.",
  },
  "email.spf.policy.unknown": {
    title: "The final policy could not be read",
    explanation:
      "The record hands the decision to another record through redirect, and that one could not be walked to the end.",
  },
  "email.spf.policy.blocked": { title: "The final policy was not assessed" },
  "email.spf.deprecated.fail.ptr": {
    title: "The record uses the ptr mechanism",
    explanation:
      "RFC 7208 advises against publishing ptr: it requires reverse queries, which are slow and unreliable.",
    impact: "Some receivers handle this mechanism differently from others.",
    recommendation: "Replace ptr with explicit ip4 and ip6 addresses, or with the a mechanism.",
  },
  "email.spf.deprecated.absent": { title: "The record uses no deprecated mechanism" },
  "email.spf.deprecated.blocked": { title: "The record's mechanisms were not checked" },
  "category.email": { title: "Mail" },
  "category.dns": { title: "DNS" },
  "category.registry": { title: "Domain" },
  "category.tls": { title: "SSL/TLS" },

  "confidence.HIGH": { title: "Full confidence" },
  "confidence.REDUCED": { title: "Reduced confidence" },

  "web.error.request_invalid": { title: "The request could not be read" },
  "web.error.scan_scope_invalid": { title: "This combination of checks is not valid" },
  "web.error.scan_scope_not_available": {
    title: "This deployment cannot run the requested checks yet",
  },
  "web.error.rate_limited": {
    title: "Too many checks in a row",
    explanation:
      "2check runs on a single server and queries other people's public services, so the number of checks from one address is limited.",
    recommendation: "Wait a minute and try again.",
  },
  "web.error.service_unavailable": {
    title: "The service is not accepting checks right now",
    explanation: "This instance is not ready, so a new check is not started.",
    recommendation: "Try again in a few minutes.",
  },
  "web.error.service_busy": {
    title: "The service is busy right now",
    explanation: "As many checks are running at once as the server can carry.",
    recommendation: "Try again in a few seconds.",
  },
  "web.error.gated_access_denied": { title: "Access to this data is not granted" },
  "web.error.scan_not_found": { title: "This scan is unknown or has expired" },
  "web.error.input_empty": { title: "Enter a domain" },
  "web.error.input_scheme_unsupported": { title: "Only http and https addresses are accepted" },
  "web.error.input_credentials_present": { title: "Remove the credentials from the address" },
  "web.error.input_port_not_allowed": { title: "A non-standard port is not supported" },
  "web.error.input_ip_address": {
    title: "Enter a domain name, not an IP address",
    explanation:
      "2check checks what belongs to a name: its DNS records, its registration in the zone and the certificate presented for that name. An address on its own has none of these.",
    recommendation: "Enter the name that points at this address, for example example.uz.",
  },
  "web.error.input_wildcard_hostname": { title: "A wildcard name cannot be checked" },
  "web.error.input_email_address": { title: "Enter a domain name, not an email address" },
  "web.error.input_single_label": { title: "Enter a full domain name, for example example.uz" },
  "web.error.input_reserved_hostname": { title: "This name is reserved and cannot be checked" },
  "web.error.input_hostname_invalid": { title: "This is not a valid domain name" },
};
