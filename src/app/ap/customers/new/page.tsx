import { redirect } from "next/navigation";

/** Alias: New Customer → application onboarding flow. */
export default function ApCustomersNewPage() {
  redirect("/ap/applications/new");
}
