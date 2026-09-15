import type { ReactNode } from "react";
import "../globals.css";

/**
 * PRD 24.1 — the root layout of the neutral entry point.
 *
 * The product has two root layouts, one per route group, precisely so that `<html lang>` can
 * state the language of the document. A single shared root would have to hard-code one language
 * and would then lie on two thirds of the pages.
 */
/**
 * Applied before first paint so a reader who chose a theme never sees the other one flash.
 * Without a stored choice nothing is set and the CSS follows the operating system.
 */
const THEME_SCRIPT =
  '(function(){try{var t=localStorage.getItem("2check-theme");' +
  'if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()';

export default function NeutralLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the pre-paint theme script is a constant. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
