import type { Catalogue } from "../types.js";

/**
 * PRD 13.2 — fact, then impact, then recommendation, and the last two only where the data
 * supports them. PRD 13.5 — no unproven causation: a resolver disagreement is reported as a
 * disagreement, not as "DNS propagation"; NXDOMAIN is not reported as "available to buy".
 */
export const en: Catalogue = {
  "dns.name.existence.pass": { title: "The name exists in DNS" },
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
  "dns.record.resolve.absent": { title: "No {recordType} record was found" },
  "dns.record.resolve.name_not_found": {
    title: "The name does not exist, so {recordType} was not evaluated",
  },
  "dns.record.resolve.unknown": {
    title: "Could not check the {recordType} record",
    explanation: "The resolvers did not produce enough agreeing answers.",
  },

  "dns.record.consistency.pass": { title: "The resolvers agree about {recordType}" },
  "dns.record.consistency.fail": {
    title: "The resolvers disagree about {recordType}",
    explanation: "Some resolvers see the record and others do not.",
    impact: "Visitors may get different answers depending on which resolver they use.",
    recommendation: "Compare the zone on every authoritative server and check recent changes.",
  },

  "registry.lookup.registered": { title: "The domain is registered" },
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

  "tls.connection.pass": { title: "Connected over {ipFamily} using {protocol}" },
  "tls.connection.fail": {
    title: "Could not establish a TLS connection over {ipFamily}",
    explanation: "The address answered, but the connection or the handshake did not complete.",
    impact: "Browsers reaching the site over {ipFamily} cannot open it securely.",
    recommendation:
      "Check that port 443 is served on this address and that the TLS service is running.",
  },
  "tls.connection.unknown": {
    title: "Could not check the TLS connection over {ipFamily}",
    explanation:
      "The check did not complete on our side, so nothing was observed about the target.",
  },
  "tls.connection.not_applicable": { title: "No {ipFamily} address, so nothing to connect to" },

  "tls.certificate.validity.pass": { title: "The certificate is within its validity period" },
  "tls.certificate.validity.fail": {
    title: "The certificate is outside its validity period",
    explanation: "The certificate has expired or is not valid yet.",
    impact: "Browsers show a warning and most visitors will not proceed.",
    recommendation: "Reissue or renew the certificate and reload the TLS service.",
  },
  "tls.certificate.validity.blocked": { title: "The certificate was not evaluated" },

  "tls.certificate.hostname.pass": { title: "The certificate covers this hostname" },
  "tls.certificate.hostname.fail": {
    title: "The certificate does not cover this hostname",
    explanation: "The hostname is not present among the certificate's subject alternative names.",
    impact: "Browsers show a name mismatch warning.",
    recommendation: "Reissue the certificate with this hostname included.",
  },
  "tls.certificate.hostname.blocked": { title: "The hostname match was not evaluated" },

  "tls.certificate.chain.pass": { title: "The certificate chain is trusted" },
  "tls.certificate.chain.fail": {
    title: "The certificate chain is not trusted",
    explanation:
      "The chain is self-signed or could not be built to a trusted root with the certificates the server sent.",
    impact: "Clients that do not already trust this chain will refuse the connection.",
    recommendation: "Serve the full chain, including the intermediate certificates.",
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
  "web.error.scan_not_found": { title: "This scan is unknown or has expired" },
  "web.error.input_empty": { title: "Enter a domain" },
  "web.error.input_scheme_unsupported": { title: "Only http and https addresses are accepted" },
  "web.error.input_credentials_present": { title: "Remove the credentials from the address" },
  "web.error.input_port_not_allowed": { title: "A non-standard port is not supported" },
  "web.error.input_ip_address": { title: "Enter a domain name, not an IP address" },
  "web.error.input_wildcard_hostname": { title: "A wildcard name cannot be checked" },
  "web.error.input_email_address": { title: "Enter a domain name, not an email address" },
  "web.error.input_single_label": { title: "Enter a full domain name, for example example.uz" },
  "web.error.input_reserved_hostname": { title: "This name is reserved and cannot be checked" },
  "web.error.input_hostname_invalid": { title: "This is not a valid domain name" },
};
