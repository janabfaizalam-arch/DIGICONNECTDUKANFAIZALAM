import React from "react";
import Link from "next/link";
import { BookOpen, Calendar, ArrowRight, BookMarked } from "lucide-react";
import { getPublishedArticles, type Article } from "@/lib/articles";

interface FallbackArticle {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
}

const fallbackArticles: FallbackArticle[] = [
  {
    title: "GST Registration Online Guide: Checklist of Required Documents",
    slug: "gst-registration-online-guide",
    excerpt: "Learn how to register for GSTIN in India. Get a complete list of applicant documents, rental agreement terms, and step-by-step application tips.",
    category: "GST & Tax",
    date: "June 05, 2026"
  },
  {
    title: "Tax Saving Tips: How to Maximize ITR Deductions Under 80C & 80D",
    slug: "tax-saving-tips-itr-deductions",
    excerpt: "File your ITR return correctly. Discover major sections to reduce tax liability, check zero balance forms, and claim maximum cashback refunds.",
    category: "Income Tax",
    date: "June 02, 2026"
  },
  {
    title: "Passport Online Apply: Document Checklist & Slot Scheduling",
    slug: "passport-online-apply-checklist",
    excerpt: "A simple guide to applying for a fresh passport online in India. Learn about age certificates, address proofs, and RTO exam slots scheduling.",
    category: "Gov ID Cards",
    date: "May 28, 2026"
  }
];

export async function KnowledgeCenter() {
  let dbArticles: Article[] = [];
  try {
    dbArticles = await getPublishedArticles();
  } catch (err) {
    console.warn("[knowledge-center] Failed to retrieve dynamic articles:", err);
  }

  // Merge or fallback
  const displayArticles = dbArticles.length >= 3 
    ? dbArticles.slice(0, 3).map(art => ({
        title: art.title,
        slug: art.slug,
        excerpt: art.excerpt || art.content.slice(0, 120) + "...",
        category: art.category || "Resources",
        date: new Date(art.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      }))
    : fallbackArticles;

  return (
    <section id="blog" className="bg-slate-50/30 py-12 px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/3 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[90px] pointer-events-none" />

      <div className="container-shell max-w-[1600px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-blue-500" /> SEO Powerhouse
            </p>
            <h2 className="mt-1.5 text-xl md:text-2xl font-black tracking-tight text-slate-800">
              Knowledge Center
            </h2>
          </div>
          <Link
            href="/blog"
            className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            All Articles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Articles Bento Layout */}
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {displayArticles.map((article) => (
            <article 
              key={article.slug}
              className="glass-liquid-premium rounded-3xl p-6 flex flex-col justify-between border-white/50 hover:border-blue-400/40"
            >
              <div>
                {/* Meta details */}
                <div className="flex items-center justify-between gap-3 text-[10px] font-black text-slate-400 uppercase">
                  <span>{article.category}</span>
                  <span className="flex items-center gap-1 leading-none font-semibold">
                    <Calendar className="h-3 w-3 text-slate-350" /> {article.date}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-4 text-sm md:text-base font-black text-slate-800 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>

                {/* Excerpt */}
                <p className="mt-3 text-xs leading-relaxed text-slate-450 font-semibold line-clamp-3">
                  {article.excerpt}
                </p>
              </div>

              {/* Action link */}
              <div className="mt-6 pt-4 border-t border-slate-100/70 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <BookMarked className="h-3.5 w-3.5 text-blue-500" /> 5 Min Read
                </span>
                <Link
                  href={`/blog/${article.slug}`}
                  className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 group/link"
                >
                  Read Article
                  <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>

            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
