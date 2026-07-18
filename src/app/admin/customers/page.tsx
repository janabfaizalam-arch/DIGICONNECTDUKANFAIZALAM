import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminCustomersPage() {
  return (
    <SimpleAdminDataPage
      title="Customers"
      table="customers"
      columns="id, full_name, mobile, email, created_at"
    />
  );
}
