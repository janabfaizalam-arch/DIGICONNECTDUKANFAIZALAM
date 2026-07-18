import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminApplicationsPage() {
  return (
    <SimpleAdminDataPage
      title="Applications"
      table="applications"
      columns="id, service_name, status, payment_status, tracking_code, amount, created_at"
    />
  );
}
