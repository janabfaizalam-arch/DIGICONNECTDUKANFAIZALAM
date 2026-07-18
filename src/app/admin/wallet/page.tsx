import { SimpleAdminDataPage } from "@/components/admin/simple-data-page";

export const dynamic = "force-dynamic";

export default function AdminWalletPage() {
  return (
    <SimpleAdminDataPage
      title="Wallets"
      table="wallets"
      columns="id, user_id, balance, updated_at"
      orderBy="updated_at"
    />
  );
}
