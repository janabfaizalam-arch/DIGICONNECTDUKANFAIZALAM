import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/admin/primitives/layout";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminArticleForm } from "@/components/admin/admin-article-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminArticleById } from "@/lib/articles";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const article = await getAdminArticleById(id);
  if (!article) notFound();

  return (
    <PageContainer width="form" className="space-y-6">
      <AdminPageHeader eyebrow="Articles" title="Edit Article" description="Update content, SEO metadata, and publishing status." />
      <AdminArticleForm article={article} />
    </PageContainer>
  );
}
