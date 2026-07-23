import { redirect } from "next/navigation";

/** Alias: Collect Payment → payment links workspace. */
export default function ApPaymentsCollectPage() {
  redirect("/ap/payment-links");
}
