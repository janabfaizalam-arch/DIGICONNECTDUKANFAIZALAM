import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminServicesPage() {
  return (
    <SimpleAdminDataPage
      title="Services"
      table="services"
      columns="id, name, slug, amount, active, sort_order"
      orderBy="sort_order"
    />
  );
}
