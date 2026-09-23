import type { Locale } from "./chrome";
import type { PublicStats, StatsCopy } from "./stats";

/**
 * PRD 28 — the statistics page as markup, apart from where the figures come from.
 *
 * The page itself is a fetch and this; keeping the two separate is what lets the layout be
 * rendered against fixtures and looked at, rather than only inspected in the source.
 */
const LOCALE_TAG: Readonly<Record<Locale, string>> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-GB",
};

/** Proper nouns, so they read the same in every language. */
const BROWSER_NAMES: Readonly<Record<string, string>> = {
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  opera: "Opera",
  samsung: "Samsung Internet",
  yandex: "Yandex Browser",
};

/**
 * The verdict taxonomy has five values because the scoring rules need five. A reader wants to
 * know whether the domains people check turn out fine, so the page groups them into the three
 * answers to that question and leaves the five to the result pages that earn them.
 */
const VERDICT_GROUPS: readonly (readonly ["clean" | "notes" | "problems", readonly string[]])[] = [
  ["clean", ["HEALTHY"]],
  ["notes", ["RECOMMENDATIONS", "NO_CONFIRMED_ISSUES_INCOMPLETE"]],
  ["problems", ["PROBLEMS", "CRITICAL_PROBLEM"]],
];

function groupVerdicts(verdicts: Readonly<Record<string, number>>, copy: StatsCopy) {
  return VERDICT_GROUPS.map(([group, codes]) => ({
    key: group,
    label: copy.verdictGroups[group],
    value: codes.reduce((sum, code) => sum + (verdicts[code] ?? 0), 0),
  })).filter((row) => row.value > 0);
}

/**
 * A long tail of one-session browsers is a row each and says nothing. Everything past the
 * leaders is added up instead, which keeps the total honest without spending a line on it.
 */
const BROWSERS_SHOWN = 4;

function foldTail(
  rows: readonly { readonly key: string; readonly sessions: number }[],
  otherKey: string,
): readonly { readonly key: string; readonly sessions: number }[] {
  if (rows.length <= BROWSERS_SHOWN + 1) {
    return rows;
  }
  const head = rows.slice(0, BROWSERS_SHOWN);
  const tail = rows.slice(BROWSERS_SHOWN).reduce((sum, row) => sum + row.sessions, 0);
  return tail === 0 ? head : [...head, { key: otherKey, sessions: tail }];
}

function count(value: number, locale: Locale): string {
  return value.toLocaleString(LOCALE_TAG[locale]);
}

/** The one number the page opens with. No panel around it — it is a figure, not a dashboard. */
function Headline({ label, value }: { label: string; value: string }) {
  return (
    <p className="headline-figure">
      <span className="headline-value">{value}</span>
      <span className="headline-label">{label}</span>
    </p>
  );
}

/**
 * A list of counts: a label, and the number. There is no bar and no chart on this page — a
 * reader asked for the figures, and a figure is easier to read as a figure than as a rectangle
 * they have to measure by eye.
 */
function Counts({
  rows,
  locale,
}: {
  rows: readonly {
    readonly key: string;
    readonly label: string;
    readonly value: number;
    readonly href?: string;
  }[];
  locale: Locale;
}) {
  return (
    <ul className="counts">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="count-label">
            {row.href === undefined ? row.label : <a href={row.href}>{row.label}</a>}
          </span>
          <span className="count-value">{count(row.value, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function StatsView({
  stats,
  copy,
  locale: key,
}: {
  stats: PublicStats;
  copy: StatsCopy;
  locale: Locale;
}) {
  const verdictTotal = Object.values(stats.verdicts).reduce((sum, value) => sum + value, 0);
  const verdicts = groupVerdicts(stats.verdicts, copy);
  const browsers = foldTail(stats.audience.browsers, copy.otherBrowser);
  const toolTotal = Object.values(stats.tools).reduce((sum, value) => sum + value, 0);
  const deviceTotal = stats.audience.devices.reduce((sum, entry) => sum + entry.sessions, 0);
  const browserTotal = stats.audience.browsers.reduce((sum, entry) => sum + entry.sessions, 0);

  /**
   * The four pages a scan can be started from, in the order they sit in the navigation.
   *
   * A PARTIAL scan of several categories at once is counted apart by the service, and is not
   * listed here: the interface has no page that produces one, so a row for it would name
   * something a reader cannot go and look at. Nothing on this page claims to be a total, so
   * leaving it out misstates nothing.
   */
  const TOOLS: readonly (readonly [string, string])[] = [
    ["home", `/${key}`],
    ["dns", `/${key}/dns-check`],
    ["registry", `/${key}/whois`],
    ["tls", `/${key}/ssl-check`],
  ];

  return (
    <>
      <h1>{copy.title}</h1>
      <p className="lede">{copy.description}</p>

      <Headline label={copy.scansTotal} value={count(stats.scansTotal, key)} />

      {verdictTotal > 0 && (
        <section className="section">
          <h2>{copy.verdictsHeading}</h2>
          <Counts locale={key} rows={verdicts} />
        </section>
      )}

      {toolTotal > 0 && (
        <section className="section">
          <h2>{copy.toolsHeading}</h2>
          <Counts
            locale={key}
            rows={TOOLS.map(([code, href]) => ({
              key: code,
              label: copy.toolNames[code] ?? code,
              value: stats.tools[code] ?? 0,
              href,
            }))}
          />
        </section>
      )}

      <section className="section">
        <h2>{copy.audienceHeading}</h2>
        <Counts
          locale={key}
          rows={[
            { key: "sessions", label: copy.sessions, value: stats.audience.sessions },
            { key: "returning", label: copy.returning, value: stats.audience.returningSessions },
          ]}
        />
        <p className="counts-note">{copy.sessionsNote}</p>
        {deviceTotal > 0 && (
          <>
            <h3 className="sub-heading">{copy.devicesHeading}</h3>
            <Counts
              locale={key}
              rows={stats.audience.devices.map((entry) => ({
                key: entry.key,
                label: copy.deviceNames[entry.key] ?? entry.key,
                value: entry.sessions,
              }))}
            />
          </>
        )}
        {browserTotal > 0 && (
          <>
            <h3 className="sub-heading">{copy.browsersHeading}</h3>
            <Counts
              locale={key}
              rows={browsers.map((entry) => ({
                key: entry.key,
                label: BROWSER_NAMES[entry.key] ?? copy.otherBrowser,
                value: entry.sessions,
              }))}
            />
          </>
        )}
      </section>

      <section className="section prose">
        <h2>{copy.privacyHeading}</h2>
        {copy.privacy.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </section>

      <p className="hint">
        {copy.generatedAt}{" "}
        <time dateTime={stats.generatedAt} suppressHydrationWarning>
          {new Date(stats.generatedAt).toLocaleString(LOCALE_TAG[key], {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </time>{" "}
        · {copy.generatedNote}
      </p>
    </>
  );
}
