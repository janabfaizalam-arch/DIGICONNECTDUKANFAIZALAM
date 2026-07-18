import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminReportsPage() {
  return (
    <SimpleAdminDataPage
      title="Reports / Export"
      table="applications"
      columns="id, service_name, status, payment_status, amount, created_at"
    />
  );
}
