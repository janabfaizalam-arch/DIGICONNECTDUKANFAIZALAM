"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Article } from "@/lib/articles";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export function AdminArticlesList({ articles }: { articles: Article[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesSearch = !query || `${article.title} ${article.slug} ${article.excerpt ?? ""} ${article.category ?? ""}`.toLowerCase().includes(query);
      const matchesStatus = status === "all" || article.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [articles, search, status]);

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, slug, category..." className="h-11 pl-11" />
        </label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!visibleArticles.length ? <AdminEmptyState title="No articles found" description="Create an article or change the filters." /> : null}
      <div className="grid gap-3">
        {visibleArticles.map((article) => (
          <Link key={article.id} href={`/admin/articles/${article.id}/edit`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:bg-blue-50">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-slate-950">{article.title}</p>
                <p className="mt-1 text-sm text-slate-600">{article.excerpt || article.slug}</p>
                <p className="mt-2 text-xs font-mono text-slate-500">{formatDate(article.updated_at)}</p>
              </div>
              <AdminStatusBadge status={article.status} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
