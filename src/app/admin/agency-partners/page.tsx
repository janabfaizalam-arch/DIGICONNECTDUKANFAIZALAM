import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminAgencyPartnersPage() {
  return (
    <SimpleAdminDataPage
      title="Agency Partners"
      table="agency_partners"
      columns="id, business_name, mobile, email, status, created_at"
    />
  );
}
