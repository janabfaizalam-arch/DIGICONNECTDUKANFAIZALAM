import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArticleBySlug } from "@/lib/articles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article Not Found | DigiConnect Dukan" };
  return {
    title: article.seo_title || `${article.title} | DigiConnect Dukan`,
    description: article.seo_description || article.excerpt || article.title,
    keywords: article.keywords ?? [],
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-soft md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">{article.category || "Guide"}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-950">{article.title}</h1>
        {article.excerpt ? <p className="mt-4 text-lg leading-8 text-slate-600">{article.excerpt}</p> : null}
        <div className="mt-8 whitespace-pre-line text-base leading-8 text-slate-700">{article.content}</div>
      </article>
    </main>
  );
}
