import { resolveMessage } from "@2check/messages";
import { LANGUAGE_OF, LOCALE_NAMES, type Locale } from "./chrome";
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

function count(value: number, locale: Locale): string {
  return value.toLocaleString(LOCALE_TAG[locale]);
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="figure">
      <span className="figure-value">{value}</span>
      <span className="figure-label">{label}</span>
    </div>
  );
}

/**
 * A share of a total, drawn as a bar. There is no charting library here on purpose: the page
 * shows two shapes, both of which are a number and a proportion, and a dependency that ships a
 * rendering engine to draw a rectangle would be the largest thing on the site.
 */
function Shares({
  rows,
  total,
  locale,
}: {
  rows: readonly { readonly key: string; readonly label: string; readonly value: number }[];
  total: number;
  locale: Locale;
}) {
  return (
    <ul className="shares">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="share-label">{row.label}</span>
          <span className="share-track" aria-hidden="true">
            <span
              className={`share-fill tone-${row.key.toLowerCase()}`}
              style={{ width: `${total === 0 ? 0 : Math.round((row.value / total) * 100)}%` }}
            />
          </span>
          <span className="share-value">{count(row.value, locale)}</span>
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
  const peak = Math.max(1, ...stats.byDay.map((entry) => entry.scans));
  const verdictTotal = Object.values(stats.verdicts).reduce((sum, value) => sum + value, 0);
  const modeTotal = Object.values(stats.modes).reduce((sum, value) => sum + value, 0);
  const localeTotal = stats.audience.locales.reduce((sum, entry) => sum + entry.views, 0);

  return (
    <>
      <h1>{copy.title}</h1>
      <p className="lede">{copy.description}</p>

      <section className="section">
        <div className="figures">
          <Figure label={copy.scansTotal} value={count(stats.scans.total, key)} />
          <Figure label={copy.scansCompleted} value={count(stats.scans.completed, key)} />
          <Figure label={copy.scans30} value={count(stats.scans.last30Days, key)} />
          <Figure label={copy.scans24} value={count(stats.scans.last24Hours, key)} />
        </div>
      </section>

      <section className="section">
        <h2>{copy.chartHeading}</h2>
        {stats.byDay.length === 0 ? (
          <p className="muted">{copy.chartEmpty}</p>
        ) : (
          <ol className="daily">
            {stats.byDay.map((entry) => (
              <li key={entry.day} title={`${entry.day}: ${entry.scans}`}>
                <span
                  className="daily-bar"
                  style={{ height: `${Math.max(2, Math.round((entry.scans / peak) * 100))}%` }}
                />
                <span className="daily-day">{entry.day.slice(8)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {verdictTotal > 0 && (
        <section className="section">
          <h2>{copy.verdictsHeading}</h2>
          <Shares
            locale={key}
            rows={Object.entries(stats.verdicts).map(([code, value]) => ({
              key: code,
              label:
                resolveMessage({ titleCode: `verdict.${code}` }, LANGUAGE_OF[key]).title || code,
              value,
            }))}
            total={verdictTotal}
          />
        </section>
      )}

      {modeTotal > 0 && (
        <section className="section">
          <h2>{copy.modesHeading}</h2>
          <Shares
            locale={key}
            rows={Object.entries(stats.modes).map(([code, value]) => ({
              key: code,
              label: copy.modeNames[code] ?? code,
              value,
            }))}
            total={modeTotal}
          />
        </section>
      )}

      <section className="section">
        <h2>{copy.audienceHeading}</h2>
        <div className="figures">
          <Figure label={copy.sessions} value={count(stats.audience.sessions, key)} />
          <Figure label={copy.returning} value={count(stats.audience.returningSessions, key)} />
          <Figure label={copy.views} value={count(stats.audience.views, key)} />
        </div>
        {localeTotal > 0 && (
          <>
            <h3 className="sub-heading">{copy.localesHeading}</h3>
            <Shares
              locale={key}
              rows={stats.audience.locales.map((entry) => ({
                key: entry.locale,
                label: LOCALE_NAMES[entry.locale as Locale] ?? entry.locale,
                value: entry.views,
              }))}
              total={localeTotal}
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
        </time>
      </p>
    </>
  );
}
