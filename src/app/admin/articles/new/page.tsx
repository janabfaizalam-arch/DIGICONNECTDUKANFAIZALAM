import { redirect } from "next/navigation";
import { PageContainer } from "@/components/admin/primitives/layout";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminArticleForm } from "@/components/admin/admin-article-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export default async function NewArticlePage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <PageContainer width="form" className="space-y-6">
      <AdminPageHeader eyebrow="Articles" title="New Article" description="Write and publish a new SEO blog article." />
      <AdminArticleForm />
    </PageContainer>
  );
}
