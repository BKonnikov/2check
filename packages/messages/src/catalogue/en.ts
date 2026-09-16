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
    title: "Could not check the {recordType} record",
    explanation: "The resolvers did not produce enough agreeing answers.",
  },

  "dns.record.consistency.pass": {
    title: "The resolvers agree about {recordType}",
    explanation:
      "We ask several independent public resolvers. The same answer from all of them means the change has propagated and visitors see the same thing whichever provider they use.",
  },
  "dns.record.consistency.fail": {
    title: "The resolvers disagree about {recordType}",
    explanation: "Some resolvers see the record and others do not.",
    impact: "Visitors may get different answers depending on which resolver they use.",
    recommendation: "Compare the zone on every authoritative server and check recent changes.",
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
