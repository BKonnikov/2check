import { createPostgresAnalyticsStore } from "../analytics/store.js";
import { loadEnv } from "../config/env.js";
import { createPool } from "../storage/pool.js";

/**
 * PRD 28.5 — the usage funnel and the traffic behind it, printed for the operator.
 *
 * It is a command rather than a page on purpose: a statistics page would need an account, and an
 * account is a whole surface — sessions, passwords, recovery — for a number one person reads.
 *
 * Usage:
 *   node dist/cli/stats.js [days]           report over the last N days (default 30)
 *   node dist/cli/stats.js --prune [days]   delete events older than N days (default 400)
 */
function percentage(part: number, whole: number): string {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}

async function main(): Promise<void> {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);
  const analytics = createPostgresAnalyticsStore(pool);
  const args = process.argv.slice(2);

  if (args[0] === "--prune") {
    const days = Number.parseInt(args[1] ?? "400", 10);
    const removed = await analytics.prune(days);
    process.stdout.write(`removed ${removed} analytics events older than ${days} days\n`);
    await pool.end();
    return;
  }

  const days = Number.parseInt(args[0] ?? "30", 10);
  const report = await analytics.report(days);
  const total = (name: string): number => report.totals[name] ?? 0;

  const out: string[] = [];
  out.push(`2check — использование за последние ${days} дн.`, "");

  out.push("Воронка");
  const views = total("scan_form_viewed");
  for (const [label, value] of [
    ["открыли форму", views],
    ["запустили проверку", total("scan_submitted")],
    ["проверка принята", total("scan_accepted")],
    ["посмотрели результат", total("scan_result_viewed")],
  ] as const) {
    out.push(`  ${pad(label, 22)} ${String(value).padStart(7)}  ${percentage(value, views)}`);
  }
  out.push("");

  out.push("Показатели");
  const accepted = total("scan_accepted");
  out.push(
    `  ${pad("довели до результата", 26)} ${percentage(total("scan_result_viewed"), accepted)}`,
  );
  out.push(
    `  ${pad("открыли подробности", 26)} ${percentage(total("technical_details_opened"), total("scan_result_viewed"))}`,
  );
  out.push(
    `  ${pad("поделились", 26)} ${percentage(total("share_clicked"), total("scan_result_viewed"))}`,
  );
  out.push(
    `  ${pad("перепроверили", 26)} ${percentage(total("refresh_clicked"), total("scan_result_viewed"))}`,
  );
  out.push(
    `  ${pad("вернувшиеся сессии", 26)} ${percentage(report.returningSessions, report.sessions)} (${report.sessions} сессий)`,
  );
  out.push("");

  const modes = Object.entries(report.modes);
  if (modes.length > 0) {
    out.push("Режимы");
    for (const [mode, count] of modes) {
      out.push(`  ${pad(mode, 26)} ${String(count).padStart(7)}`);
    }
    out.push("");
  }

  if (report.byLocale.length > 0) {
    out.push("Языки");
    for (const row of report.byLocale) {
      out.push(`  ${pad(row.locale, 26)} ${String(row.views).padStart(7)}`);
    }
    out.push("");
  }

  if (report.byTool.length > 0) {
    out.push("Страницы");
    for (const row of report.byTool) {
      out.push(`  ${pad(row.tool, 26)} ${String(row.views).padStart(7)}`);
    }
    out.push("");
  }

  if (report.byDay.length > 0) {
    out.push("По дням");
    out.push(
      `  ${pad("дата", 12)} ${"визиты".padStart(8)} ${"запуски".padStart(9)} ${"результаты".padStart(11)}`,
    );
    for (const row of report.byDay) {
      out.push(
        `  ${pad(row.day, 12)} ${String(row.views).padStart(8)} ${String(row.submitted).padStart(9)} ${String(row.results).padStart(11)}`,
      );
    }
  }

  process.stdout.write(`${out.join("\n")}\n`);
  await pool.end();
}

main().catch(async (error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
