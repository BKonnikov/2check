"use client";

const STORAGE_KEY = "2check-theme";

/**
 * The theme is applied by an inline script before first paint, so this button only has to record
 * the choice. Both icons are always in the markup and CSS shows the one for the theme the button
 * switches to — that way the server and the client render exactly the same HTML and nothing
 * flickers while React hydrates.
 */
export default function ThemeToggle({ label }: { readonly label: string }) {
  function toggle(): void {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A browser that refuses storage still gets the theme for this page view.
    }
  }

  return (
    <button type="button" className="theme" onClick={toggle} aria-label={label} title={label}>
      <svg className="icon-moon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M14 10.2A6.5 6.5 0 0 1 5.8 2 6.5 6.5 0 1 0 14 10.2Z" />
      </svg>
      <svg
        className="icon-sun"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="3.1" />
        <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" />
      </svg>
    </button>
  );
}
