import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/auth/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata.full_name ?? user.user_metadata.name ?? "User";
  const email = user.email ?? "";
  const avatarUrl = user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "";

  return <DashboardShell name={name} email={email} avatarUrl={avatarUrl} />;
}
