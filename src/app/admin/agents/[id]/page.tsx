import { redirect } from "next/navigation";

import { ADMIN_DIGI_PARTNERS_ROUTE } from "@/lib/admin/nav";

type Props = { params: Promise<{ id: string }> };

/** Legacy agent detail → Digi Partners list (partner id may differ from profile id). */
export default async function AdminAgentDetailRedirectPage({ params }: Props) {
  await params;
  redirect(ADMIN_DIGI_PARTNERS_ROUTE);
}
