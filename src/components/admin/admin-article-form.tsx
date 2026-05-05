"use client";

import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Trash2 } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Article } from "@/lib/articles";

export function AdminArticleForm({ article }: { article?: Article | null }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch(article ? `/api/admin/articles/${article.id}` : "/api/admin/articles", {
          method: article ? "PATCH" : "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; articleId?: string };
        if (!response.ok) throw new Error(result.message ?? "Article could not be saved.");
        success(result.message ?? "Article saved.");
        router.push("/admin/articles");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Article could not be saved.");
      }
    });
  }

  function deleteArticle() {
    if (!article || !window.confirm("Delete this article?")) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/articles/${article.id}`, { method: "DELETE" });
      if (response.ok) {
        success("Article deleted.");
        router.push("/admin/articles");
        router.refresh();
      } else {
        toastError("Article could not be deleted.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="title" defaultValue={article?.title ?? ""} placeholder="Title" required />
        <Input name="slug" defaultValue={article?.slug ?? ""} placeholder="slug-auto-if-empty" />
        <Input name="category" defaultValue={article?.category ?? ""} placeholder="Category" />
        <Input name="featuredImageUrl" defaultValue={article?.featured_image_url ?? ""} placeholder="Featured image URL optional" />
        <Input name="seoTitle" defaultValue={article?.seo_title ?? ""} placeholder="SEO title" />
        <Input name="keywords" defaultValue={article?.keywords?.join(", ") ?? ""} placeholder="keyword one, keyword two" />
        <Textarea name="excerpt" defaultValue={article?.excerpt ?? ""} placeholder="Excerpt" className="md:col-span-2" />
        <Textarea name="seoDescription" defaultValue={article?.seo_description ?? ""} placeholder="SEO description" className="md:col-span-2" />
        <Textarea name="content" defaultValue={article?.content ?? ""} placeholder="Article content" className="min-h-72 md:col-span-2" required />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select name="status" defaultValue={article?.status ?? "draft"}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {article ? (
            <Button type="button" variant="outline" onClick={deleteArticle} disabled={isPending} className="text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Article
          </Button>
        </div>
      </div>
    </form>
  );
}
