import { redirect } from "next/navigation";

export default function AdminCashbackRedirectPage() {
  redirect("/admin/wallet");
}
