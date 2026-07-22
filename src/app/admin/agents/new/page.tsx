import { redirect } from "next/navigation";

import { ADMIN_DIGI_PARTNERS_ROUTE } from "@/lib/admin/nav";

export default function AdminAgentsNewRedirectPage() {
  redirect(`${ADMIN_DIGI_PARTNERS_ROUTE}/new`);
}
