import type { ReactNode } from "react";
import "../globals.css";

/**
 * PRD 24.1 — the root layout of the neutral entry point.
 *
 * The product has two root layouts, one per route group, precisely so that `<html lang>` can
 * state the language of the document. A single shared root would have to hard-code one language
 * and would then lie on two thirds of the pages.
 */
export default function NeutralLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
