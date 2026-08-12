"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import type { HomepageFaq } from "@/lib/homepage/faqs";
import type { HomepageReel } from "@/lib/homepage/reels";
import type { HomepageTestimonial } from "@/lib/homepage/testimonials";

type Tab = "faqs" | "testimonials" | "reels";

const INPUT =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:opacity-50";
const AREA =
  "min-h-[92px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:opacity-50";
const LABEL = "mb-1 block text-xs font-bold text-slate-600";

function emptyFaq(): Partial<HomepageFaq> {
  return { question: "", answer: "", category: "General", sort_order: 0, is_active: true };
}

function emptyReel(): Partial<HomepageReel> {
  return { title: "", caption: "", video_url: "", sort_order: 0, is_active: true };
}

function emptyTestimonial(): Partial<HomepageTestimonial> {
  return {
    customer_name: "",
    customer_location: "",
    review_text: "",
    rating: 5,
    sort_order: 0,
    is_active: true,
    consent_confirmed: false,
  };
}

/** Shown when the SQL migration has not been applied to this project yet. */
function SetupNotice({ hint }: { hint: string }) {
  return (
    <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <p className="text-sm font-bold text-amber-900">Database setup needed</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-800">{hint}</p>
    </Card>
  );
}

export function HomepageContentManager() {
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<Tab>("faqs");

  const [faqs, setFaqs] = useState<HomepageFaq[]>([]);
  const [testimonials, setTestimonials] = useState<HomepageTestimonial[]>([]);
  const [reels, setReels] = useState<HomepageReel[]>([]);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [faqDraft, setFaqDraft] = useState<Partial<HomepageFaq>>(emptyFaq());
  const [testimonialDraft, setTestimonialDraft] = useState<Partial<HomepageTestimonial>>(emptyTestimonial());
  const [reelDraft, setReelDraft] = useState<Partial<HomepageReel>>(emptyReel());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [faqRes, testimonialRes, reelRes] = await Promise.all([
        fetch("/api/admin/homepage/faqs", { cache: "no-store" }),
        fetch("/api/admin/homepage/testimonials", { cache: "no-store" }),
        fetch("/api/admin/homepage/reels", { cache: "no-store" }),
      ]);
      const faqBody = (await faqRes.json().catch(() => ({}))) as {
        rows?: HomepageFaq[];
        setupHint?: string | null;
      };
      const testimonialBody = (await testimonialRes.json().catch(() => ({}))) as {
        rows?: HomepageTestimonial[];
        setupHint?: string | null;
      };

      const reelBody = (await reelRes.json().catch(() => ({}))) as {
        rows?: HomepageReel[];
        setupHint?: string | null;
      };

      setFaqs(faqBody.rows ?? []);
      setTestimonials(testimonialBody.rows ?? []);
      setReels(reelBody.rows ?? []);
      setSetupHint(faqBody.setupHint ?? testimonialBody.setupHint ?? reelBody.setupHint ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(kind: Tab, body: unknown) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/homepage/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toastError(result.error ?? "Could not save.");
        return false;
      }

      success("Saved.");
      if (kind === "faqs") setFaqDraft(emptyFaq());
      else if (kind === "reels") setReelDraft(emptyReel());
      else setTestimonialDraft(emptyTestimonial());
      await load();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: Tab, id: string, label: string) {
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;

    const response = await fetch(`/api/admin/homepage/${kind}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toastError("Could not delete.");
      return;
    }
    success("Deleted.");
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm font-semibold text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {setupHint ? <SetupNotice hint={setupHint} /> : null}

      <div className="flex gap-2">
        {(["faqs", "testimonials", "reels"] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold capitalize transition ${
              tab === value
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {value === "faqs"
              ? `FAQs (${faqs.length})`
              : value === "testimonials"
                ? `Testimonials (${testimonials.length})`
                : `Reels (${reels.length})`}
          </button>
        ))}
      </div>

      {tab === "faqs" ? (
        <>
          <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              {faqDraft.id ? "Edit question" : "Add a question"}
            </h2>
            <div className="grid gap-3">
              <div>
                <label className={LABEL} htmlFor="faq-q">Question</label>
                <input id="faq-q" className={INPUT} value={faqDraft.question ?? ""} disabled={saving}
                  onChange={(e) => setFaqDraft((d) => ({ ...d, question: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL} htmlFor="faq-a">Answer</label>
                <textarea id="faq-a" className={AREA} value={faqDraft.answer ?? ""} disabled={saving}
                  onChange={(e) => setFaqDraft((d) => ({ ...d, answer: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL} htmlFor="faq-cat">Category</label>
                  <input id="faq-cat" className={INPUT} value={faqDraft.category ?? ""} disabled={saving}
                    placeholder="Payments" onChange={(e) => setFaqDraft((d) => ({ ...d, category: e.target.value }))} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="faq-order">Order</label>
                  <input id="faq-order" type="number" className={INPUT} value={faqDraft.sort_order ?? 0} disabled={saving}
                    onChange={(e) => setFaqDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))} />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={faqDraft.is_active ?? true} disabled={saving}
                    onChange={(e) => setFaqDraft((d) => ({ ...d, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300" />
                  Show on homepage
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" disabled={saving || !faqDraft.question?.trim() || !faqDraft.answer?.trim()}
                onClick={() => void save("faqs", faqDraft)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {faqDraft.id ? "Update" : "Add question"}
              </button>
              {faqDraft.id ? (
                <button type="button" onClick={() => setFaqDraft(emptyFaq())}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">
                  Cancel
                </button>
              ) : null}
            </div>
          </Card>

          <Card className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            {faqs.length ? (
              faqs.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 p-4">
                  <button type="button" onClick={() => setFaqDraft(row)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-slate-900">{row.question}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{row.answer}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {row.category} · order {row.sort_order}
                      {row.is_active ? "" : " · hidden"}
                    </p>
                  </button>
                  <button type="button" aria-label="Delete" onClick={() => void remove("faqs", row.id, row.question)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                No questions yet — the homepage is showing its built-in list.
              </p>
            )}
          </Card>
        </>
      ) : tab === "testimonials" ? (
        <>
          <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              {testimonialDraft.id ? "Edit testimonial" : "Add a testimonial"}
            </h2>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="t-name">Customer name</label>
                  <input id="t-name" className={INPUT} value={testimonialDraft.customer_name ?? ""} disabled={saving}
                    onChange={(e) => setTestimonialDraft((d) => ({ ...d, customer_name: e.target.value }))} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="t-loc">Location</label>
                  <input id="t-loc" className={INPUT} value={testimonialDraft.customer_location ?? ""} disabled={saving}
                    placeholder="Lucknow, UP"
                    onChange={(e) => setTestimonialDraft((d) => ({ ...d, customer_location: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="t-text">Review</label>
                <textarea id="t-text" className={AREA} value={testimonialDraft.review_text ?? ""} disabled={saving}
                  onChange={(e) => setTestimonialDraft((d) => ({ ...d, review_text: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL} htmlFor="t-video">Video link (optional — YouTube or Vimeo)</label>
                <input id="t-video" className={INPUT} value={testimonialDraft.video_url ?? ""} disabled={saving}
                  placeholder="https://youtu.be/…"
                  onChange={(e) => setTestimonialDraft((d) => ({ ...d, video_url: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL} htmlFor="t-service">Service (optional)</label>
                  <input id="t-service" className={INPUT} value={testimonialDraft.service_label ?? ""} disabled={saving}
                    placeholder="GST Registration"
                    onChange={(e) => setTestimonialDraft((d) => ({ ...d, service_label: e.target.value }))} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="t-rating">Rating</label>
                  <select id="t-rating" className={INPUT} value={testimonialDraft.rating ?? 5} disabled={saving}
                    onChange={(e) => setTestimonialDraft((d) => ({ ...d, rating: Number(e.target.value) }))}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="t-order">Order</label>
                  <input id="t-order" type="number" className={INPUT} value={testimonialDraft.sort_order ?? 0} disabled={saving}
                    onChange={(e) => setTestimonialDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))} />
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <input type="checkbox" checked={testimonialDraft.consent_confirmed ?? false} disabled={saving}
                  onChange={(e) => setTestimonialDraft((d) => ({ ...d, consent_confirmed: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300" />
                <span>
                  This customer agreed to their name{testimonialDraft.video_url ? ", face and voice" : ""} being shown
                  publicly. Required before it can appear on the site.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={testimonialDraft.is_active ?? true} disabled={saving}
                  onChange={(e) => setTestimonialDraft((d) => ({ ...d, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300" />
                Show on homepage
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button"
                disabled={saving || !testimonialDraft.customer_name?.trim() || !testimonialDraft.review_text?.trim()}
                onClick={() => void save("testimonials", testimonialDraft)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {testimonialDraft.id ? "Update" : "Add testimonial"}
              </button>
              {testimonialDraft.id ? (
                <button type="button" onClick={() => setTestimonialDraft(emptyTestimonial())}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">
                  Cancel
                </button>
              ) : null}
            </div>
          </Card>

          <Card className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            {testimonials.length ? (
              testimonials.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 p-4">
                  <button type="button" onClick={() => setTestimonialDraft(row)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-slate-900">
                      {row.customer_name}
                      {row.video_url ? <span className="ml-2 text-[11px] font-bold text-blue-600">VIDEO</span> : null}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{row.review_text}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {row.rating}★ · order {row.sort_order}
                      {row.is_active ? "" : " · hidden"}
                      {row.consent_confirmed ? "" : " · consent missing"}
                    </p>
                  </button>
                  <button type="button" aria-label="Delete"
                    onClick={() => void remove("testimonials", row.id, row.customer_name)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                No testimonials yet — the homepage section stays hidden until one is added.
              </p>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              {reelDraft.id ? "Edit reel" : "Add a reel"}
            </h2>
            <div className="grid gap-3">
              <div>
                <label className={LABEL} htmlFor="r-title">Title</label>
                <input id="r-title" className={INPUT} value={reelDraft.title ?? ""} disabled={saving}
                  placeholder="GST registration in 3 days"
                  onChange={(e) => setReelDraft((d) => ({ ...d, title: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL} htmlFor="r-caption">Caption</label>
                <input id="r-caption" className={INPUT} value={reelDraft.caption ?? ""} disabled={saving}
                  onChange={(e) => setReelDraft((d) => ({ ...d, caption: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL} htmlFor="r-video">Video link</label>
                <input id="r-video" className={INPUT} value={reelDraft.video_url ?? ""} disabled={saving}
                  placeholder="https://…/reel.mp4 or a YouTube Shorts link"
                  onChange={(e) => setReelDraft((d) => ({ ...d, video_url: e.target.value }))} />
                <p className="mt-1 pl-1 text-[11px] text-slate-500">
                  A direct .mp4 file plays inline and autoplays on scroll. A YouTube Shorts or Vimeo link works too,
                  but shows that player&apos;s own controls.
                </p>
              </div>
              <div>
                <label className={LABEL} htmlFor="r-poster">Cover image (recommended)</label>
                <input id="r-poster" className={INPUT} value={reelDraft.poster_url ?? ""} disabled={saving}
                  placeholder="https://…/cover.jpg"
                  onChange={(e) => setReelDraft((d) => ({ ...d, poster_url: e.target.value }))} />
                <p className="mt-1 pl-1 text-[11px] text-slate-500">
                  Without a cover the card is black until the video loads.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL} htmlFor="r-cta-label">Button text (optional)</label>
                  <input id="r-cta-label" className={INPUT} value={reelDraft.cta_label ?? ""} disabled={saving}
                    placeholder="Apply now"
                    onChange={(e) => setReelDraft((d) => ({ ...d, cta_label: e.target.value }))} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="r-cta-href">Button link</label>
                  <input id="r-cta-href" className={INPUT} value={reelDraft.cta_href ?? ""} disabled={saving}
                    placeholder="/services/gst-registration"
                    onChange={(e) => setReelDraft((d) => ({ ...d, cta_href: e.target.value }))} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="r-order">Order</label>
                  <input id="r-order" type="number" className={INPUT} value={reelDraft.sort_order ?? 0} disabled={saving}
                    onChange={(e) => setReelDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={reelDraft.is_active ?? true} disabled={saving}
                  onChange={(e) => setReelDraft((d) => ({ ...d, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300" />
                Show on homepage
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" disabled={saving || !reelDraft.title?.trim() || !reelDraft.video_url?.trim()}
                onClick={() => void save("reels", reelDraft)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {reelDraft.id ? "Update" : "Add reel"}
              </button>
              {reelDraft.id ? (
                <button type="button" onClick={() => setReelDraft(emptyReel())}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">
                  Cancel
                </button>
              ) : null}
            </div>
          </Card>

          <Card className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            {reels.length ? (
              reels.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 p-4">
                  <button type="button" onClick={() => setReelDraft(row)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-slate-900">{row.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.caption || row.video_url}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      order {row.sort_order}
                      {row.poster_url ? "" : " · no cover image"}
                      {row.is_active ? "" : " · hidden"}
                    </p>
                  </button>
                  <button type="button" aria-label="Delete" onClick={() => void remove("reels", row.id, row.title)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                No reels yet — the homepage section stays hidden until one is added.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
