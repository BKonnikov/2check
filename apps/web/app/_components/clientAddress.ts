/**
 * The caller's address as the edge reported it.
 *
 * The leftmost entry of X-Forwarded-For is the client as the first proxy saw it; nginx appends
 * each further hop on the right (deploy/nginx.example.conf), so the rightmost entries are our
 * own machines. X-Real-IP is the fallback for a deployment that sets only that.
 *
 * This value is best-effort by nature: X-Forwarded-For is a header, and a client that sends one
 * of its own has it kept and appended to rather than replaced. It is good enough to tell one
 * visitor from another for fairness, and it is deliberately NOT what protects the service from
 * a flood — that belongs at the edge, where the TCP source address cannot be claimed.
 */
export function clientAddress(headers: Headers): string | undefined {
  const chain = headers.get("x-forwarded-for");
  const first = chain?.split(",")[0]?.trim();
  if (first !== undefined && first !== "") {
    return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  return real === undefined || real === "" ? undefined : real;
}
