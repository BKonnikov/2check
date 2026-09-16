import { describe, expect, it } from "vitest";
import { groupAnswers } from "../app/_components/DomainChecker";

/**
 * PRD 8.3 — four resolvers usually answer identically. Printing the same thirty TXT records four
 * times over is how a disclosure becomes unreadable, and it buries the one case worth seeing:
 * a resolver that actually answered differently.
 */
describe("the resolver answers are grouped, not repeated", () => {
  const MX = ["30 alt2.example.net", "10 mx.example.net", "20 alt1.example.net"];

  it("puts resolvers that agree into one group", () => {
    const groups = groupAnswers({ google: MX, cloudflare: MX, quad9: MX });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.providers).toEqual(["google", "cloudflare", "quad9"]);
  });

  it("sorts an MX answer by priority, not as text", () => {
    // As text, "30" sorts before "5"; as a mail exchanger it does not.
    const groups = groupAnswers({ google: ["30 c.example.net", "5 a.example.net"] });
    expect(groups[0]?.answers).toEqual(["5 a.example.net", "30 c.example.net"]);
  });

  it("groups by what was answered, not by the order it came in", () => {
    const groups = groupAnswers({ google: MX, cloudflare: [...MX].reverse() });
    expect(groups).toHaveLength(1);
  });

  it("separates the resolver that differs", () => {
    const groups = groupAnswers({ google: MX, cloudflare: MX, quad9: ["10 mx.example.net"] });
    expect(groups).toHaveLength(2);
    expect(groups[1]?.providers).toEqual(["quad9"]);
    expect(groups[1]?.answers).toEqual(["10 mx.example.net"]);
  });

  it("keeps a resolver that answered nothing", () => {
    const groups = groupAnswers({ google: MX, quad9: [] });
    expect(groups).toHaveLength(2);
    expect(groups[1]?.answers).toEqual([]);
  });
});
