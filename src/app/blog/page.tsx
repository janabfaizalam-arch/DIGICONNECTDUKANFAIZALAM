import type { Metadata } from "next";
import Link from "next/link";

import { getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Blog | DigiConnect Dukan",
  description: "Read DigiConnect Dukan guides for services, documents, finance, insurance, and government forms.",
};

export default async function BlogPage() {
  const articles = await getPublishedArticles();

  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-slate-950">DigiConnect Dukan Blog</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Useful guides for online apply, document assistance, insurance, finance, and government services in India.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={`/blog/${article.slug}`} className="rounded-2xl border bg-white p-5 shadow-soft transition hover:-translate-y-0.5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">{article.category || "Guide"}</p>
              <h2 className="mt-3 text-xl font-bold text-slate-950">{article.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{article.excerpt || article.seo_description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
