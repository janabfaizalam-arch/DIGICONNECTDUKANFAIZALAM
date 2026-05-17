"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { Copy, Eye, GripVertical, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AdminService, DbServiceCategory } from "@/lib/services";

type Faq = { question: string; answer: string };
type Review = { name: string; location: string; text: string };
type BuilderSection = {
  key: string;
  section_type: string;
  title: string;
  subtitle: string;
  body: string;
  mediaUrl: string;
  is_active: boolean;
};

const sectionTypes = [
  "hero",
  "overview",
  "benefits",
  "documents",
  "process",
  "faq",
  "gallery",
  "testimonials",
  "pricing",
  "stats",
  "banner",
  "rich_text",
  "custom_html",
  "video",
  "trust_badges",
  "offer_strip",
  "contact_cta",
];

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

function bodyFromContent(type: string, content: Record<string, unknown> | null | undefined) {
  if (!content) return "";
  if (typeof content.text === "string") return content.text;
  if (typeof content.html === "string") return content.html;
  if (typeof content.url === "string") return content.url;
  if (Array.isArray(content.items)) return content.items.map(String).join("\n");
  if (Array.isArray(content.images)) return content.images.map(String).join("\n");
  if (type === "stats" && Array.isArray(content.stats)) return content.stats.map((item) => JSON.stringify(item)).join("\n");
  return JSON.stringify(content, null, 2);
}

function contentFromSection(section: BuilderSection) {
  const lines = section.body.split("\n").map((item) => item.trim()).filter(Boolean);
  if (["benefits", "documents", "process", "trust_badges"].includes(section.section_type)) return { items: lines };
  if (section.section_type === "gallery") return { images: lines, mediaUrl: section.mediaUrl || undefined };
  if (section.section_type === "custom_html") return { html: section.body };
  if (section.section_type === "video") return { url: section.body || section.mediaUrl };
  if (section.section_type === "stats") return { items: lines };
  return { text: section.body, mediaUrl: section.mediaUrl || undefined };
}

function initialSections(service?: AdminService | null): BuilderSection[] {
  const rows = (service?.service_sections ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  if (rows.length) {
    return rows.map((section) => ({
      key: section.id,
      section_type: section.section_type,
      title: section.title ?? "",
      subtitle: section.subtitle ?? "",
      body: bodyFromContent(section.section_type, section.content),
      mediaUrl: typeof section.content?.mediaUrl === "string" ? section.content.mediaUrl : "",
      is_active: section.is_active,
    }));
  }

  return [
    { key: "hero", section_type: "hero", title: service?.title ?? "", subtitle: service?.short_description ?? "", body: service?.full_description ?? service?.overview ?? "", mediaUrl: service?.hero_image_url ?? "", is_active: true },
    { key: "overview", section_type: "overview", title: "Overview", subtitle: "", body: service?.full_description ?? service?.overview ?? "", mediaUrl: "", is_active: true },
    { key: "benefits", section_type: "benefits", title: "Benefits", subtitle: "", body: (service?.benefits ?? []).join("\n"), mediaUrl: "", is_active: true },
    { key: "documents", section_type: "documents", title: "Documents Required", subtitle: "", body: (service?.documents ?? []).join("\n"), mediaUrl: "", is_active: true },
    { key: "process", section_type: "process", title: "Process", subtitle: "", body: (service?.process ?? []).join("\n"), mediaUrl: "", is_active: true },
    { key: "faq", section_type: "faq", title: "FAQ", subtitle: "", body: "", mediaUrl: "", is_active: true },
  ];
}

function SectionBuilder({ sections, onChange }: { sections: BuilderSection[]; onChange: (sections: BuilderSection[]) => void }) {
  const [dragKey, setDragKey] = useState<string | null>(null);

  function update(key: string, patch: Partial<BuilderSection>) {
    onChange(sections.map((section) => (section.key === key ? { ...section, ...patch } : section)));
  }

  function move(fromKey: string, toKey: string) {
    const fromIndex = sections.findIndex((section) => section.key === fromKey);
    const toIndex = sections.findIndex((section) => section.key === toKey);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const next = [...sections];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-slate-950">Page Builder</p>
          <p className="mt-1 text-sm text-slate-600">Drag sections to reorder. Each section renders on the public service page.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...sections, { key: `${Date.now()}`, section_type: "rich_text", title: "New Section", subtitle: "", body: "", mediaUrl: "", is_active: true }])}>
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
      </div>
      <div className="mt-4 grid gap-3">
        {sections.map((section) => (
          <div
            key={section.key}
            draggable
            onDragStart={() => setDragKey(section.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragKey) move(dragKey, section.key);
              setDragKey(null);
            }}
            className="rounded-xl border bg-white p-3"
          >
            <div className="grid gap-2 md:grid-cols-[auto_170px_1fr_1fr_auto] md:items-center">
              <div className="flex cursor-grab items-center text-slate-400" aria-label="Drag section">
                <GripVertical className="h-5 w-5" />
              </div>
              <Select value={section.section_type} onValueChange={(value) => update(section.key, { section_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sectionTypes.map((type) => <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={section.title} onChange={(event) => update(section.key, { title: event.target.value })} placeholder="Section title" />
              <Input value={section.subtitle} onChange={(event) => update(section.key, { subtitle: event.target.value })} placeholder="Subtitle" />
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={section.is_active} onChange={(event) => update(section.key, { is_active: event.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px_auto_auto]">
              <Textarea value={section.body} onChange={(event) => update(section.key, { body: event.target.value })} placeholder="Content. For list sections, put one item per line." className="min-h-24" />
              <Input value={section.mediaUrl} onChange={(event) => update(section.key, { mediaUrl: event.target.value })} placeholder="Media URL" />
              <Button type="button" variant="outline" onClick={() => onChange([...sections, { ...section, key: `${Date.now()}-${section.key}`, title: `${section.title} Copy` }])}>
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
              <Button type="button" variant="outline" onClick={() => onChange(sections.filter((item) => item.key !== section.key))} className="text-red-600">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
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
  const [sections, setSections] = useState<BuilderSection[]>(() => initialSections(service));
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
    formData.set("isPaid", formData.get("isPaid") ? "true" : "false");
    formData.set("isFeatured", formData.get("isFeatured") ? "true" : "false");
    formData.set("showOnHomepage", formData.get("showOnHomepage") ? "true" : "false");
    formData.set("isActive", formData.get("isActive") ? "true" : "false");
    formData.set("categorySlug", categories.find((category) => category.id === formData.get("categoryId"))?.slug ?? "");
    formData.set("sections", JSON.stringify(sections.map((section, index) => ({
      section_type: section.section_type,
      title: section.title.trim(),
      subtitle: section.subtitle.trim(),
      content: contentFromSection(section),
      sort_order: (index + 1) * 10,
      is_active: section.is_active,
    }))));

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
        <Textarea name="overview" defaultValue={service?.overview ?? service?.full_description ?? ""} placeholder="Overview" className="min-h-28 md:col-span-2" />
        <Textarea name="fullDescription" defaultValue={service?.full_description ?? service?.overview ?? ""} placeholder="Full description" className="min-h-28 md:col-span-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RepeatableTextList label="Benefits" items={benefits} onChange={setBenefits} />
        <RepeatableTextList label="Documents" items={documents} onChange={setDocuments} />
        <RepeatableTextList label="Process" items={process} onChange={setProcess} />
        <RepeatableTextList label="SEO Keywords" items={seoKeywords} onChange={setSeoKeywords} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input name="basePrice" type="number" defaultValue={service?.base_price ?? service?.old_price ?? ""} placeholder="Base price" />
        <Input name="salePrice" type="number" defaultValue={service?.sale_price ?? service?.offer_price ?? ""} placeholder="Discount / sale price" />
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
          <input name="isPaid" type="checkbox" defaultChecked={service?.is_paid ?? Number(service?.offer_price ?? 0) > 0} className="h-4 w-4" />
          Paid service
        </label>
        <label className="flex h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
          <input name="isActive" type="checkbox" defaultChecked={service?.is_active ?? service?.status === "published"} className="h-4 w-4" />
          Active / published
        </label>
        <label className="flex h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
          <input name="isFeatured" type="checkbox" defaultChecked={service?.is_featured ?? service?.featured ?? false} className="h-4 w-4" />
          Featured service
        </label>
        <label className="flex h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
          <input name="showOnHomepage" type="checkbox" defaultChecked={service?.show_on_homepage ?? false} className="h-4 w-4" />
          Show on homepage
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input name="heroImageUrl" defaultValue={service?.hero_image_url ?? ""} placeholder="Hero image URL" />
        <Input name="heroImageStoragePath" defaultValue={service?.hero_image_storage_path ?? ""} placeholder="Hero storage path" />
        <Input name="heroImage" type="file" accept="image/jpeg,image/png,image/webp" className="md:col-span-2" />
        <Input name="ctaPrimaryLabel" defaultValue={service?.cta_primary_label ?? ""} placeholder="Primary CTA label" />
        <Input name="ctaPrimaryUrl" defaultValue={service?.cta_primary_url ?? ""} placeholder="Primary CTA URL" />
        <Input name="ctaSecondaryLabel" defaultValue={service?.cta_secondary_label ?? ""} placeholder="Secondary CTA label" />
        <Input name="ctaSecondaryUrl" defaultValue={service?.cta_secondary_url ?? ""} placeholder="Secondary CTA URL" />
      </div>

      <SectionBuilder sections={sections} onChange={setSections} />

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
