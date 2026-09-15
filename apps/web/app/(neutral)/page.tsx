import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { alternates } from "../_components/chrome";

/** PRD 24.1 — "/" is a neutral entry point and the x-default target. */
export const metadata: Metadata = { alternates: alternates("") };

export default function NeutralEntry() {
  redirect("/ru");
}
