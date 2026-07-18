import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminCouponsPage() {
  return (
    <SimpleAdminDataPage
      title="Coupons"
      table="coupons"
      columns="id, code, discount_type, discount_value, active, used_count"
    />
  );
}
