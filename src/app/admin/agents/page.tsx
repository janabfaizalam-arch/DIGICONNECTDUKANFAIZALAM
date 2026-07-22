import { redirect } from "next/navigation";

import { ADMIN_DIGI_PARTNERS_ROUTE } from "@/lib/admin/nav";

/** Legacy Agents list → canonical Digi Partners. */
export default function AdminAgentsRedirectPage() {
  redirect(ADMIN_DIGI_PARTNERS_ROUTE);
}
