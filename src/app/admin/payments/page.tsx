import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminPaymentsPage() {
  return (
    <SimpleAdminDataPage
      title="Payments"
      table="payments"
      columns="id, amount, status, razorpay_payment_id, paid_at, created_at"
    />
  );
}
