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
  "email.mx.records.present.service": {
    title: "The domain's mail is received by {service}",
    fact: "Usable hosts: {count}",
    explanation:
      "The MX records point at this service's hosts. That is read from the records and says where delivery is directed, not what an organisation uses.",
  },
  "email.mx.records.present.forwarding": {
    title: "The domain's mail is received by {service} forwarding",
    fact: "Usable hosts: {count}",
    explanation:
      "{service} is a forwarding service: it accepts a message and passes it to another address, keeping no mailbox of its own. The records look the same as an ordinary mail provider's while the arrangement differs, which is why this is said separately.",
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
    impact: "The domain's records name no destination for mail to be directed to.",
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
  "email.dmarc.record.present": {
    title: "A DMARC policy is published",
    fact: "The domain has a record of its own",
    explanation:
      "DMARC is a DNS record in which the domain owner tells receivers what to do with a message that neither SPF nor DKIM confirmed.",
  },
  "email.dmarc.record.present.inherited": {
    title: "The DMARC policy is inherited from {source}",
    fact: "The domain publishes no record of its own",
    explanation:
      "RFC 9989 lets a receiver take the policy of a higher domain. For a subdomain this is the ordinary arrangement.",
  },
  "email.dmarc.record.present.suffix": {
    title: "The DMARC policy comes from the suffix {source}",
    fact: "The domain publishes no record of its own",
    explanation:
      "The record is published at the public suffix and applies to the domains beneath it.",
  },
  "email.dmarc.record.fail.absent": {
    title: "No DMARC policy is published",
    explanation:
      "DMARC is a DNS record in which the domain owner tells receivers what to do with a message that neither SPF nor DKIM confirmed.",
    impact:
      "A receiver has nothing to apply to a message in the domain's name that failed the checks.",
    recommendation:
      "Publish a TXT record at the _dmarc name holding v=DMARC1; p=none; rua=mailto:dmarc@yourdomain, then move on to quarantine and reject.",
  },
  "email.dmarc.record.fail.multiple": {
    title: "There is more than one DMARC record",
    fact: "Records found: {count}",
    explanation: "RFC 9989 allows a name only one DMARC record.",
    impact: "A receiver does not pick one of them; it discards them all.",
    recommendation: "Leave a single record at the _dmarc name.",
  },
  "email.dmarc.record.fail.unrecognised": {
    title: "The DMARC record is not recognised",
    explanation:
      "The v tag holding DMARC1 has to come first in the record, and that value is written exactly so.",
    impact: "A receiver does not apply such a record and acts as though there were no policy.",
    recommendation: "Begin the record with v=DMARC1; and check the case of that value.",
  },
  "email.dmarc.record.unknown": {
    title: "The DMARC record could not be retrieved",
    explanation: "The TXT query gave no definite result. That does not mean there is no record.",
  },
  "email.dmarc.record.unknown.walk": {
    title: "The walk up the name tree did not complete",
    fact: "Queries made: {count}",
    explanation:
      "RFC 9989 finds a subdomain's policy by walking up the name tree. Some of the queries gave no definite result, so nothing can be said about a policy higher up.",
  },
  "email.dmarc.policy.pass.reject": {
    title: "The record asks for unverified messages to be rejected",
    fact: "The {tag} tag of {source}: reject",
  },
  "email.dmarc.policy.pass.quarantine": {
    title: "The record asks for unverified messages to be quarantined",
    fact: "The {tag} tag of {source}: quarantine",
    explanation:
      "Quarantine is a working mode for a domain that is still settling the list of its senders.",
  },
  "email.dmarc.policy.fail.none": {
    title: "The record asks for nothing to be done with unverified messages",
    fact: "The {tag} tag of {source}: none",
    explanation:
      "The value none is a monitoring mode: the domain owner collects reports but states no handling.",
    impact:
      "A receiver has nothing to apply to a message in the domain's name that failed the checks.",
    recommendation:
      "Once the reports are understood, change p=none to p=quarantine and then to p=reject.",
  },
  "email.dmarc.policy.fail.absent": {
    title: "The record carries no policy tag",
    fact: "The record of {source} holds neither p, nor sp, nor np",
    explanation: "Without a policy tag the record reads the same as p=none.",
    impact:
      "A receiver has nothing to apply to a message in the domain's name that failed the checks.",
    recommendation: "Add a p tag holding none, quarantine or reject.",
  },
  "email.dmarc.policy.blocked": { title: "The DMARC policy was not assessed" },
  "email.dmarc.reports.present.at": {
    title: "The record asks for aggregate reports",
    fact: "Recipient domains: {domains}",
    explanation:
      "Aggregate reports show who sends messages in the domain's name and how those messages fare in the checks. The recipient domain is visible in the record and says whether the reports go to a third party.",
  },
  "email.dmarc.reports.present": {
    title: "The record asks for aggregate reports",
    fact: "The record carries an rua tag",
    explanation:
      "Aggregate reports show who sends messages in the domain's name and how those messages fare in the checks.",
  },
  "email.dmarc.reports.fail.absent": {
    title: "The record asks for no aggregate reports",
    explanation: "The rua tag names the address receivers send DMARC aggregate reports to.",
    impact: "This mechanism yields nothing about who sends messages in the domain's name.",
    recommendation: "Add an rua tag with an address such as mailto:dmarc@example.uz.",
  },
  "email.dmarc.reports.blocked": { title: "The request for reports was not checked" },
  "email.dmarc.deprecated.absent": { title: "The record carries no superseded tags" },
  "email.dmarc.deprecated.fail.pct": {
    title: "The record uses the pct tag",
    explanation:
      "RFC 9989 removed the pct tag. A receiver following the new standard disregards it, while a receiver following RFC 7489 applies the policy to the share of messages the tag names.",
    impact: "Receivers apply the domain's policy differently from one another.",
    recommendation: "Remove the pct tag from the record.",
  },
  "email.dmarc.deprecated.blocked": { title: "The tags of the DMARC record were not checked" },

  "email.dkim.key.present": {
    title: "A DKIM key is published",
    fact: "Selector {selector}",
    explanation:
      "DKIM is a pair of keys: the mail server signs messages with the private one, and the domain owner publishes the public one in DNS under a chosen name, the selector. Publishing a key and signing messages are different acts, and DNS says nothing about the second.",
  },
  "email.dkim.key.fail.revoked": {
    title: "The DKIM key is revoked",
    fact: "Selector {selector}: the p tag is empty",
    explanation: "Under RFC 6376 an empty p tag means the owner has revoked the key.",
    impact: "A verifier does not treat signatures made with this key as valid.",
    recommendation: "Publish a working key under this selector, or remove the record.",
  },
  "email.dkim.key.fail.short": {
    title: "The DKIM key is shorter than {limit} bits",
    fact: "Selector {selector}: {bits} bits",
    explanation:
      "RFC 8301 updates RFC 6376 and forbids a verifier to treat signatures made with RSA keys shorter than {limit} bits as valid.",
    impact: "A verifier does not treat signatures made with this key as valid.",
    recommendation: "Reissue the key at 2048 bits and publish it under the same selector.",
  },
  "email.dkim.key.fail.sha1": {
    title: "The DKIM key admits sha1 and nothing else",
    fact: "Selector {selector}: the h tag holds sha1 alone",
    explanation: "RFC 8301 forbids rsa-sha1 for both signing and verifying.",
    impact: "A verifier does not treat signatures made under this key as valid.",
    recommendation: "Remove the h tag, or list sha256 in it.",
  },
  "email.dkim.key.fail.testing": {
    title: "The DKIM key declares itself a test key",
    fact: "Selector {selector}: the t tag holds y",
    explanation:
      "Under RFC 6376 the t=y flag asks a receiver to treat the domain as though the message were unsigned.",
    impact: "A receiver does not act on the outcome of verifying the signature.",
    recommendation: "Drop y from the t tag once the signing setup is finished.",
  },
  "email.dkim.key.fail.unreadable": {
    title: "The DKIM record cannot be read",
    fact: "Selector {selector}",
    explanation:
      "The record carries no p tag with a key, or its v tag holds something other than DKIM1.",
    impact: "A verifier has nothing in the record to check a signature against.",
    recommendation: "Publish a record of the form v=DKIM1; k=rsa; p=<public key>.",
  },
  "email.dkim.key.fail.absent": {
    title: "There is no record under the selector given",
    fact: "Selector tried: {selector}",
    explanation:
      "The name of this selector under _domainkey was queried. That says nothing about the domain's other selectors.",
    impact: "A verifier cannot reach a key under this name.",
    recommendation:
      "Check the spelling of the selector, or take it from the mail service's settings.",
  },
  "email.dkim.key.unknown.selector": {
    title: "No DKIM key was found under the names tried",
    fact: "Selectors tried: {selectors}",
    explanation:
      "The selector is the domain owner's to choose, and DNS cannot be asked which selectors exist: a name can only be queried once it is known. This does not mean the domain has no DKIM. Enter a selector beside the domain if you know one.",
  },
  "email.dkim.key.unknown.nothing": {
    title: "The DKIM selector is not known",
    explanation:
      "The selector is the domain owner's to choose, and DNS cannot be asked which selectors exist. The MX records name no mail service we recognise and no selector was entered, so there was nothing to query. Enter a selector beside the domain if you know one.",
  },
  "email.dkim.key.unknown.lookup": {
    title: "The DKIM record could not be retrieved",
    fact: "Selectors tried: {selectors}",
    explanation: "The TXT query gave no definite result. That does not mean there is no key.",
  },

  "email.starttls.encryption.pass": {
    title: "The receiving servers offer encryption",
    fact: "Encryption established on: {hosts}",
    explanation:
      "STARTTLS is the SMTP extension a server offers to move a session to encryption. What is encrypted is the leg to the receiving server, not the message's whole path.",
  },
  "email.starttls.encryption.pass.partial": {
    title: "Every server probed offers encryption",
    fact: "Hosts probed: {probed}, not probed: {skipped}",
    explanation:
      "The first hosts in preference order were probed; the rest were not, and the result says nothing about them.",
  },
  "email.starttls.encryption.fail.some": {
    title: "Some of the servers offer no encryption",
    fact: "Without encryption: {hosts}",
    explanation:
      "STARTTLS is the SMTP extension a server offers to move a session to encryption. A sender that reaches such a host hands the message over in the clear.",
    impact: "The leg to that host gets no encryption.",
    recommendation: "Turn STARTTLS on at the hosts listed.",
  },
  "email.starttls.encryption.fail.none": {
    title: "None of the servers probed offers encryption",
    fact: "Without encryption: {hosts}",
    explanation:
      "STARTTLS is the SMTP extension a server offers to move a session to encryption. None of the hosts probed announced it.",
    impact: "The leg to the receiving server gets no encryption.",
    recommendation: "Turn STARTTLS on at the domain's receiving hosts.",
  },
  "email.starttls.encryption.fail.upgrade": {
    title: "Encryption is offered but does not come up",
    fact: "Hosts: {hosts}",
    explanation:
      "The server announced STARTTLS, but the move to encryption did not complete: the handshake failed.",
    impact: "A sender that trusted the announcement gets no encrypted leg.",
    recommendation: "Check the certificate and the TLS configuration on the receiving host.",
  },
  "email.starttls.encryption.unknown.unavailable": {
    title: "2check does not check encryption in this deployment",
    explanation:
      "Outbound connections to the mail port are not available here. This is a limitation of the service rather than a property of the domain, and it does not lower the domain's score.",
  },
  "email.starttls.encryption.unknown.own": {
    title: "2check does not check its own servers",
    explanation:
      "The host belongs to the service's own infrastructure. 2check cannot observe itself from outside, so there is no result. This is a limitation of the service rather than a property of the domain.",
  },
  "email.starttls.encryption.unknown.blocked": {
    title: "The connection to the host was not permitted by the security check",
    explanation:
      "The host's addresses did not pass the check 2check runs before any outbound connection. This is a limitation of the service rather than a conclusion about the domain.",
  },
  "email.starttls.encryption.unknown.connect": {
    title: "The receiving server could not be reached",
    fact: "Hosts probed: {probed}, not probed: {skipped}",
    explanation:
      "The connection did not come up, so nothing is known about encryption at this host. That does not mean there is none.",
  },
  "email.starttls.encryption.unknown.incomplete": {
    title: "The session ended before it answered about encryption",
    fact: "Hosts probed: {probed}, not probed: {skipped}",
    explanation:
      "The server answered, but the session ended before STARTTLS was known either way. That does not mean there is none.",
  },
  "email.starttls.encryption.blocked": { title: "Encryption was not checked" },
  "email.starttls.certificate.pass": {
    title: "The receiving server's certificate is in order",
    fact: "Host {host}, issued by: {issuer}",
    explanation:
      "Validity, the host name and the chain of trust were checked. A certificate cannot establish whether a sender will accept the connection.",
  },
  "email.starttls.certificate.fail.expired": {
    title: "The receiving server's certificate has expired",
    fact: "Host {host}",
    explanation: "The certificate's validity period has ended.",
    impact: "Senders that check the certificate do not accept such a connection.",
    recommendation: "Reissue the certificate on this host.",
  },
  "email.starttls.certificate.fail.early": {
    title: "The receiving server's certificate is not valid yet",
    fact: "Host {host}",
    explanation: "The certificate's validity period has not begun.",
    impact: "Senders that check the certificate do not accept such a connection.",
    recommendation: "Check the certificate's start date and the clock on the host.",
  },
  "email.starttls.certificate.fail.hostname": {
    title: "The certificate was not issued for this host's name",
    fact: "Host {host}",
    explanation: "The host's name is not among the names in the certificate.",
    impact: "Senders that match the name do not accept such a connection.",
    recommendation: "Add the host's name to the certificate, or issue one for that name.",
  },
  "email.starttls.certificate.fail.untrusted": {
    title: "The certificate's chain of trust does not build",
    fact: "Host {host}",
    explanation: "The certificate does not lead up to a trusted root.",
    impact: "Senders that verify the chain do not accept such a connection.",
    recommendation: "Install the issuer's intermediate certificates on the host.",
  },
  "email.starttls.certificate.unknown": {
    title: "The chain of trust was not verified",
    fact: "Host {host}",
    explanation:
      "Verification stopped before the chain, so no verdict on trust was formed. That is not the same as an untrusted certificate.",
  },
  "email.starttls.certificate.blocked": {
    title: "The receiving server's certificate was not checked",
  },

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
