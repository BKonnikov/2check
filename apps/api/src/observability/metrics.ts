/**
 * PRD 21.4 — the canonical metric names. Counters carry the _total suffix.
 * PRD 21.1 — these describe whether 2check is working, never whether a domain is healthy:
 * a domain FAIL is a product result, not a platform error.
 */
export const METRIC_NAMES = [
  "cache_lookup_total",
  "cache_bypass_total",
  "cache_write_error_total",
  "singleflight_join_total",
  "force_refresh_total",
  "security_validation_total",
  "ssrf_policy_block_total",
  "security_validation_error_total",
  "scan_started_total",
  "scan_completed_total",
  "scan_failed_total",
] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

/**
 * PRD 21.5 and AC-21.4 — label names whose value set is unbounded, or which identify a target or
 * a request. Using one as a label would let any visitor grow the metric store without limit and
 * would put target data into operational telemetry.
 */
export const FORBIDDEN_LABELS = [
  "hostname",
  "host",
  "qname",
  "domain",
  "ip",
  "address",
  "scanid",
  "requestid",
  "fingerprint",
  "cidr",
] as const;

export type Labels = Readonly<Record<string, string>>;

export class ForbiddenLabelError extends Error {
  constructor(label: string) {
    super(`Label "${label}" has unbounded cardinality and must not be used on a metric`);
    this.name = "ForbiddenLabelError";
  }
}

function assertLabels(labels: Labels): void {
  for (const label of Object.keys(labels)) {
    if (FORBIDDEN_LABELS.includes(label.toLowerCase() as (typeof FORBIDDEN_LABELS)[number])) {
      throw new ForbiddenLabelError(label);
    }
  }
}

function seriesKey(name: MetricName, labels: Labels): string {
  const pairs = Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${value.replaceAll('"', "'")}"`);
  return pairs.length === 0 ? name : `${name}{${pairs.join(",")}}`;
}

export interface Metrics {
  increment(name: MetricName, labels?: Labels, amount?: number): void;
  snapshot(): Readonly<Record<string, number>>;
  render(): string;
}

export function createMetrics(): Metrics {
  const counters = new Map<string, number>();

  return {
    increment(name, labels = {}, amount = 1) {
      assertLabels(labels);
      const key = seriesKey(name, labels);
      counters.set(key, (counters.get(key) ?? 0) + amount);
    },

    snapshot() {
      return Object.fromEntries(counters);
    },

    /** Prometheus text exposition. Only counters exist so far, so every series is a counter. */
    render() {
      const lines: string[] = [];
      for (const name of METRIC_NAMES) {
        const series = [...counters.entries()].filter(
          ([key]) => key === name || key.startsWith(`${name}{`),
        );
        if (series.length === 0) {
          continue;
        }
        lines.push(`# TYPE ${name} counter`);
        for (const [key, value] of series) {
          lines.push(`${key} ${value}`);
        }
      }
      return `${lines.join("\n")}\n`;
    },
  };
}
