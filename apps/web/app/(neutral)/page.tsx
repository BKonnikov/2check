import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { alternates, LOCALE_COOKIE, negotiateLocale } from "../_components/chrome";

/** PRD 24.1 — "/" is a neutral entry point and the x-default target. */
export const metadata: Metadata = { alternates: alternates("") };

/** The answer depends on the request, so it cannot be a build-time redirect. */
export const dynamic = "force-dynamic";

export default async function NeutralEntry() {
  const [requestHeaders, requestCookies] = await Promise.all([headers(), cookies()]);
  const chosen = requestCookies.get(LOCALE_COOKIE)?.value ?? null;
  redirect(`/${negotiateLocale(requestHeaders.get("accept-language"), chosen)}`);
}
