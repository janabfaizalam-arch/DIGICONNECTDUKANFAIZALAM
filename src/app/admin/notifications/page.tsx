import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminNotificationsPage() {
  return (
    <SimpleAdminDataPage
      title="Notifications"
      table="notifications"
      columns="id, title, audience, created_at"
    />
  );
}
