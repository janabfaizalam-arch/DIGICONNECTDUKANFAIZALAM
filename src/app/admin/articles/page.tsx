import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminArticlesList } from "@/components/admin/admin-articles-list";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const articles = await getAdminArticles();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Articles"
        title="Blog Articles"
        description="Create SEO articles and publish them to the public blog."
        action={<Link href="/admin/articles/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />New Article</Link>}
      />
      {articles.length ? <AdminArticlesList articles={articles} /> : <AdminEmptyState title="No articles yet" description="Create your first blog article for DigiConnect Dukan." />}
    </div>
  );
}
