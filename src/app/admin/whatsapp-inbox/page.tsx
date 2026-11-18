import { redirect } from "next/navigation";

import { PageContainer } from "@/components/admin/primitives/layout";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { AdminWhatsAppInboxClient } from "@/components/admin/whatsapp-inbox/admin-whatsapp-inbox-client";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppInboxPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/admin/login");
  }

  if (!isAdminRole(role)) {
    redirect("/admin");
  }

  return (
    <PageContainer width="wide" className="space-y-4 pb-6">
      <AdminPageHeader
        eyebrow="Communications"
        title="WhatsApp Shared Inbox"
        description="Receive live WhatsApp messages from customers and reply in real time from mobile or desktop."
      />
      <AdminWhatsAppInboxClient currentUserId={user.id} />
    </PageContainer>
  );
}
