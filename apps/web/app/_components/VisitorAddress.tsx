"use client";

import { useEffect, useState } from "react";

/**
 * "Your address", as one more item in the footer's own row of links.
 *
 * It sits inline on purpose: as a paragraph of its own with an explanatory line under it, it
 * made the footer half again as tall for a detail most visitors never need. What it does and
 * does not do with the address is explained where such things belong, on the colophon.
 *
 * Fetched rather than rendered on the server so the pages stay static: only this line is
 * per-visitor. If the request fails, or the deployment sits behind a proxy chain that says
 * nothing about the caller, the line simply does not appear — an empty space is better than a
 * wrong address, and this is not worth an error message.
 */
export default function VisitorAddress({ label, note }: { label: string; note: string }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/whoami", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { address?: string } | null) => {
        if (live && typeof body?.address === "string") {
          setAddress(body.address);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (address === null) {
    return null;
  }

  return (
    <span className="visitor" title={note}>
      {label} <span className="visitor-address">{address}</span>
    </span>
  );
}
