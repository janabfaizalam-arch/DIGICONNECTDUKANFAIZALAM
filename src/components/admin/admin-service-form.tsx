"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { Eye, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AdminService, DbServiceCategory } from "@/lib/services";

type Faq = { question: string; answer: string };
type Review = { name: string; location: string; text: string };

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

function RepeatableTextList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-slate-950">{label}</p>
        <Button type="button" variant="outline" onClick={() => onChange([...items, ""])}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input value={item} onChange={(event) => onChange(items.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))} placeholder={`${label} item`} />
            <Button type="button" variant="outline" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label} item`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqEditor({ items, onChange }: { items: Faq[]; onChange: (items: Faq[]) => void }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-slate-950">FAQs</p>
        <Button type="button" variant="outline" onClick={() => onChange([...items, { question: "", answer: "" }])}>
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3">
            <Input value={item.question} onChange={(event) => onChange(items.map((faq, itemIndex) => (itemIndex === index ? { ...faq, question: event.target.value } : faq)))} placeholder="Question" />
            <Textarea value={item.answer} onChange={(event) => onChange(items.map((faq, itemIndex) => (itemIndex === index ? { ...faq, answer: event.target.value } : faq)))} placeholder="Answer" />
            <Button type="button" variant="outline" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="justify-self-start text-red-600">
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewEditor({ items, onChange }: { items: Review[]; onChange: (items: Review[]) => void }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-slate-950">Reviews</p>
        <Button type="button" variant="outline" onClick={() => onChange([...items, { name: "", location: "", text: "" }])}>
          <Plus className="h-4 w-4" />
          Add Review
        </Button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-2">
            <Input value={item.name} onChange={(event) => onChange(items.map((review, itemIndex) => (itemIndex === index ? { ...review, name: event.target.value } : review)))} placeholder="Name" />
            <Input value={item.location} onChange={(event) => onChange(items.map((review, itemIndex) => (itemIndex === index ? { ...review, location: event.target.value } : review)))} placeholder="Location" />
            <Textarea value={item.text} onChange={(event) => onChange(items.map((review, itemIndex) => (itemIndex === index ? { ...review, text: event.target.value } : review)))} placeholder="Review text" className="md:col-span-2" />
            <Button type="button" variant="outline" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="justify-self-start text-red-600">
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminServiceForm({ service, categories }: { service?: AdminService | null; categories: DbServiceCategory[] }) {
  const [title, setTitle] = useState(service?.title ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [benefits, setBenefits] = useState<string[]>(service?.benefits ?? []);
  const [documents, setDocuments] = useState<string[]>(service?.documents ?? []);
  const [process, setProcess] = useState<string[]>(service?.process ?? []);
  const [seoKeywords, setSeoKeywords] = useState<string[]>(service?.seo_keywords ?? []);
  const [faqs, setFaqs] = useState<Faq[]>(service?.faqs ?? []);
  const [reviews, setReviews] = useState<Review[]>(service?.reviews ?? []);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const previewHref = useMemo(() => (slug ? `/services/${slug}` : "/services"), [slug]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("benefits", JSON.stringify(benefits.map((item) => item.trim()).filter(Boolean)));
    formData.set("documents", JSON.stringify(documents.map((item) => item.trim()).filter(Boolean)));
    formData.set("process", JSON.stringify(process.map((item) => item.trim()).filter(Boolean)));
    formData.set("seoKeywords", JSON.stringify(seoKeywords.map((item) => item.trim()).filter(Boolean)));
    formData.set("faqs", JSON.stringify(faqs.filter((item) => item.question.trim() || item.answer.trim())));
    formData.set("reviews", JSON.stringify(reviews.filter((item) => item.name.trim() || item.text.trim())));
    formData.set("featured", formData.get("featured") ? "true" : "false");

    startTransition(async () => {
      try {
        const response = await fetch(service ? `/api/admin/services/${service.id}` : "/api/admin/services", {
          method: service ? "PATCH" : "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Service could not be saved.");
        success(result.message ?? "Service saved.");
        window.location.href = "/admin/services";
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Service could not be saved.");
      }
    });
  }

  function archiveService() {
    if (!service || !window.confirm("Archive this service?")) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
      if (response.ok) {
        success("Service archived.");
        window.location.href = "/admin/services";
      } else {
        toastError("Service could not be archived.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (!service && !slug) setSlug(slugify(event.target.value));
          }}
          onBlur={() => !slug && setSlug(slugify(title))}
          placeholder="Service name"
          required
        />
        <Input name="slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="service-slug" required />
        <Select name="categoryId" defaultValue={service?.category_id ?? categories[0]?.id ?? ""}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input name="sortOrder" type="number" defaultValue={service?.sort_order ?? 0} placeholder="Sort order" />
        <Input name="shortDescription" defaultValue={service?.short_description ?? ""} placeholder="Short description" className="md:col-span-2" />
        <Textarea name="overview" defaultValue={service?.overview ?? ""} placeholder="Overview" className="min-h-28 md:col-span-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RepeatableTextList label="Benefits" items={benefits} onChange={setBenefits} />
        <RepeatableTextList label="Documents" items={documents} onChange={setDocuments} />
        <RepeatableTextList label="Process" items={process} onChange={setProcess} />
        <RepeatableTextList label="SEO Keywords" items={seoKeywords} onChange={setSeoKeywords} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input name="oldPrice" type="number" defaultValue={service?.old_price ?? ""} placeholder="Old price" />
        <Input name="offerPrice" type="number" defaultValue={service?.offer_price ?? ""} placeholder="Offer price" />
        <Input name="priceLabel" defaultValue={service?.price_label ?? ""} placeholder="Price label" />
        <Select name="ctaType" defaultValue={service?.cta_type ?? "apply"}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="apply">Apply</SelectItem>
            <SelectItem value="enquiry">Enquiry</SelectItem>
          </SelectContent>
        </Select>
        <Input name="badge" defaultValue={service?.badge ?? ""} placeholder="Badge" />
        <Input name="icon" defaultValue={service?.icon ?? "FileText"} placeholder="Icon name, e.g. FileText" />
        <Select name="status" defaultValue={service?.status === "archived" ? "draft" : service?.status ?? "draft"}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
          <input name="featured" type="checkbox" defaultChecked={service?.featured ?? false} className="h-4 w-4" />
          Featured service
        </label>
      </div>

      <div className="grid gap-4">
        <Input name="seoTitle" defaultValue={service?.seo_title ?? ""} placeholder="SEO title" />
        <Textarea name="seoDescription" defaultValue={service?.seo_description ?? ""} placeholder="SEO description" />
        <Textarea name="blogContent" defaultValue={service?.blog_content ?? ""} placeholder="Blog / SEO content" className="min-h-72" />
      </div>

      <div className="grid gap-4">
        <FaqEditor items={faqs} onChange={setFaqs} />
        <ReviewEditor items={reviews} onChange={setReviews} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={previewHref} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          <Eye className="h-4 w-4" />
          Preview
        </Link>
        <div className="flex flex-wrap gap-2">
          {service ? (
            <Button type="button" variant="outline" onClick={archiveService} disabled={isPending} className="text-red-600">
              <Trash2 className="h-4 w-4" />
              Archive
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Service
          </Button>
        </div>
      </div>
    </form>
  );
}
