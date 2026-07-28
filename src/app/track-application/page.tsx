import { redirect } from "next/navigation";

/** Public track entry → customer applications tab. */
export default function TrackApplicationPage() {
  redirect("/customer/dashboard?tab=applications");
}
