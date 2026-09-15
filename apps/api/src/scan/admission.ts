/**
 * PRD 22.1, 22.2 and AC-25.8 — admission control.
 *
 * One accepted scan is 28 DNS queries, an RDAP call, possibly a WHOIS call and up to two TLS
 * handshakes, all against other people's public services. Without a limit the product is both a
 * way to exhaust its own single server and a way to point that traffic at someone else. So a
 * scan is admitted only if the caller is within their rate and the service is below its
 * concurrency ceiling; otherwise it is refused with 429 or 503 and a retry delay, which is what
 * §22.2 asks for in place of unbounded parallelism.
 *
 * The window is per process. One instance is what this product deploys (§22.7); a second one
 * would need this state in Redis, and the shape here is the same either way.
 */
export type Admission =
  | { readonly ok: true; release(): void }
  | {
      readonly ok: false;
      readonly reason: "rate_limited" | "service_busy";
      readonly retryAfterSeconds: number;
    };

export interface AdmissionControl {
  admit(clientKey: string): Admission;
  /** For readiness and metrics: how many scans are executing right now. */
  inFlight(): number;
}

export interface AdmissionOptions {
  readonly maxConcurrent: number;
  readonly perMinute: number;
  readonly now?: () => number;
}

const WINDOW_MS = 60_000;

export function createAdmissionControl(options: AdmissionOptions): AdmissionControl {
  const now = options.now ?? Date.now;
  const recent = new Map<string, number[]>();
  let running = 0;

  function prune(at: number): void {
    for (const [key, stamps] of recent) {
      const kept = stamps.filter((stamp) => at - stamp < WINDOW_MS);
      if (kept.length === 0) {
        recent.delete(key);
      } else {
        recent.set(key, kept);
      }
    }
  }

  return {
    inFlight: () => running,
    admit(clientKey) {
      const at = now();
      prune(at);

      const stamps = recent.get(clientKey) ?? [];
      if (stamps.length >= options.perMinute) {
        const oldest = stamps[0] ?? at;
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (at - oldest)) / 1000)),
        };
      }

      if (running >= options.maxConcurrent) {
        // Saturation is the service's problem, not the caller's: 503, and a short retry.
        return { ok: false, reason: "service_busy", retryAfterSeconds: 5 };
      }

      recent.set(clientKey, [...stamps, at]);
      running += 1;
      let released = false;
      return {
        ok: true,
        release() {
          if (!released) {
            released = true;
            running -= 1;
          }
        },
      };
    },
  };
}
