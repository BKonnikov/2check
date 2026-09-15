import { describe, expect, it } from "vitest";
import { classifyError, DEFAULT_QTYPES, DEFAULT_RESOLVERS } from "../src/dns/resolver-set.js";

function nodeError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

describe("AC-8.1 — the default resolver set", () => {
  it("is Google, Cloudflare, Yandex Basic and Quad9 Unfiltered", () => {
    expect(DEFAULT_RESOLVERS.map((entry) => entry.address)).toEqual([
      "8.8.8.8",
      "1.1.1.1",
      "77.88.8.8",
      "9.9.9.10",
    ]);
  });

  it("asks every query type of PRD 8.2", () => {
    expect([...DEFAULT_QTYPES]).toEqual(["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"]);
  });
});

describe("AC-8.2 — the resolver client separates NXDOMAIN from NODATA", () => {
  it("maps ENODATA to a NOERROR response with no data", () => {
    expect(classifyError(nodeError("ENODATA"))).toEqual({
      transportStatus: "SUCCESS",
      rcode: "NOERROR",
      outcome: "NODATA",
    });
  });

  it("maps ENOTFOUND to NXDOMAIN", () => {
    expect(classifyError(nodeError("ENOTFOUND"))).toEqual({
      transportStatus: "SUCCESS",
      rcode: "NXDOMAIN",
      outcome: "NXDOMAIN",
    });
  });
});

describe("PRD 8.3 — a server answer is not a transport failure", () => {
  it.each([
    ["ESERVFAIL", "SERVFAIL"],
    ["EREFUSED", "REFUSED"],
    ["EFORMERR", "FORMERR"],
    ["ENOTIMP", "NOTIMP"],
  ])("keeps %s as a successful transport carrying rcode %s", (code, rcode) => {
    const classified = classifyError(nodeError(code));
    expect(classified.transportStatus).toBe("SUCCESS");
    expect(classified.rcode).toBe(rcode);
    expect(classified.outcome).toBeUndefined();
  });

  it.each([
    ["ETIMEOUT", "TIMEOUT"],
    ["EBADRESP", "PROTOCOL_ERROR"],
    ["ECONNREFUSED", "NETWORK_ERROR"],
  ])("classifies %s as transport status %s", (code, transportStatus) => {
    expect(classifyError(nodeError(code)).transportStatus).toBe(transportStatus);
  });

  it("falls back to a network error for an unrecognized failure", () => {
    expect(classifyError(new Error("boom")).transportStatus).toBe("NETWORK_ERROR");
  });
});
