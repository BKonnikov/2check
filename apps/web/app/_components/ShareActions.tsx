"use client";

import type { Language } from "@2check/messages";
import { useState } from "react";
import { type AnalyticsDimensions, track } from "./analytics";
import type { Ui } from "./chrome";
import { buildShareCardModel, renderShareCard } from "./shareCard";

/**
 * PRD 23.9 and AC-23.7 — share, copy and save, all of them the same image.
 *
 * There is deliberately no "copy link": a scan URL is a capability (PRD 25.5), and handing one
 * out would make a shareable entity of a result that has none. The image is rendered here, in
 * the browser, from the result already on the page — the server is not asked for it and keeps
 * no record that it happened.
 */
export default function ShareActions({
  scan,
  language,
  ui,
  dimensions,
}: {
  scan: Parameters<typeof buildShareCardModel>[0];
  language: Language;
  ui: Ui;
  dimensions: AnalyticsDimensions;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function card(): Promise<{ blob: Blob; name: string }> {
    const model = buildShareCardModel(scan, language, ui);
    const blob = await renderShareCard(model);
    return { blob, name: model.file.name };
  }

  async function run(action: (made: { blob: Blob; name: string }) => Promise<void>): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      await action(await card());
    } catch {
      // A reader who cancels the share sheet is not an error worth shouting about, but a browser
      // that could not produce the image at all is.
      setNote(ui.shareFailed);
    } finally {
      setBusy(false);
    }
  }

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function";

  return (
    <div className="share">
      {canShareFiles && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async ({ blob, name }) => {
              const file = new File([blob], name, { type: "image/png" });
              if (!navigator.canShare({ files: [file] })) {
                throw new Error("files cannot be shared here");
              }
              track("share_clicked", dimensions);
              await navigator.share({ files: [file] });
              // PRD 28.2 — the optional outcome event, recorded only because the promise
              // resolving here means the sheet completed. AC-28.5 — it says nothing about who
              // received the image or where it went.
              track("share_completed", dimensions);
            })
          }
        >
          {ui.share}
        </button>
      )}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() =>
          void run(async ({ blob }) => {
            track("share_clicked", dimensions);
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setNote(ui.shareCopied);
          })
        }
      >
        {ui.shareCopy}
      </button>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() =>
          void run(async ({ blob, name }) => {
            track("share_image_saved", dimensions);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = name;
            link.click();
            URL.revokeObjectURL(url);
          })
        }
      >
        {ui.shareSave}
      </button>
      <span className="hint share-note" aria-live="polite">
        {note ?? ui.shareNote}
      </span>
    </div>
  );
}
