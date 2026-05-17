"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Archive, Copy, Eye, LoaderCircle, Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { useToast } from "@/components/providers/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminService, DbServiceCategory } from "@/lib/services";
import { cn } from "@/lib/utils";

export function AdminServicesList({ services, categories }: { services: AdminService[]; categories: DbServiceCategory[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((service) => {
      const haystack = `${service.title} ${service.slug} ${service.short_description ?? ""} ${service.category?.name ?? ""}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesCategory = category === "all" || service.category_id === category;
      const matchesStatus = status === "all" || service.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [category, search, services, status]);

  function updateStatus(service: AdminService, nextStatus: "draft" | "published") {
    const formData = new FormData();
    formData.set("categoryId", service.category_id ?? "");
    formData.set("title", service.title);
    formData.set("slug", service.slug);
    formData.set("shortDescription", service.short_description ?? "");
    formData.set("overview", service.overview ?? "");
    formData.set("fullDescription", service.full_description ?? service.overview ?? "");
    formData.set("benefits", JSON.stringify(service.benefits ?? []));
    formData.set("documents", JSON.stringify(service.documents ?? []));
    formData.set("process", JSON.stringify(service.process ?? []));
    formData.set("basePrice", service.base_price?.toString() ?? service.old_price?.toString() ?? "");
    formData.set("salePrice", service.sale_price?.toString() ?? service.offer_price?.toString() ?? "");
    formData.set("priceLabel", service.price_label ?? "");
    formData.set("ctaType", service.cta_type);
    formData.set("badge", service.badge ?? "");
    formData.set("icon", service.icon ?? "FileText");
    formData.set("status", nextStatus);
    formData.set("isActive", nextStatus === "published" ? "true" : "false");
    formData.set("isPaid", service.is_paid ? "true" : "false");
    formData.set("isFeatured", service.is_featured ?? service.featured ? "true" : "false");
    formData.set("showOnHomepage", service.show_on_homepage ? "true" : "false");
    formData.set("categorySlug", service.category_slug ?? service.category?.slug ?? "");
    formData.set("heroImageUrl", service.hero_image_url ?? "");
    formData.set("heroImageStoragePath", service.hero_image_storage_path ?? "");
    formData.set("ctaPrimaryLabel", service.cta_primary_label ?? "");
    formData.set("ctaPrimaryUrl", service.cta_primary_url ?? "");
    formData.set("ctaSecondaryLabel", service.cta_secondary_label ?? "");
    formData.set("ctaSecondaryUrl", service.cta_secondary_url ?? "");
    formData.set("featured", String(service.featured));
    formData.set("sortOrder", String(service.sort_order));
    formData.set("seoTitle", service.seo_title ?? "");
    formData.set("seoDescription", service.seo_description ?? "");
    formData.set("seoKeywords", JSON.stringify(service.seo_keywords ?? []));
    formData.set("blogContent", service.blog_content ?? "");
    formData.set("faqs", JSON.stringify(service.faqs ?? []));
    formData.set("reviews", JSON.stringify(service.reviews ?? []));
    formData.set("sections", JSON.stringify((service.service_sections ?? []).map((section) => ({
      section_type: section.section_type,
      title: section.title,
      subtitle: section.subtitle,
      content: section.content,
      sort_order: section.sort_order,
      is_active: section.is_active,
    }))));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${service.id}`, { method: "PATCH", body: formData });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Service status could not be changed.");
        success(nextStatus === "published" ? "Service published." : "Service unpublished.");
        window.location.reload();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Service status could not be changed.");
      }
    });
  }

  function archiveService(service: AdminService) {
    if (!window.confirm(`Archive ${service.title}? It will stop showing publicly.`)) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
      if (response.ok) {
        success("Service archived.");
        window.location.reload();
      } else {
        toastError("Service could not be archived.");
      }
    });
  }

  function duplicateService(service: AdminService) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${service.id}/duplicate`, { method: "POST" });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Service could not be duplicated.");
        success(result.message ?? "Service duplicated.");
        window.location.reload();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Service could not be duplicated.");
      }
    });
  }

  async function seedServices() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/services/seed", { method: "POST" });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Services could not be seeded.");
        success(result.message ?? "Services seeded.");
        window.location.reload();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Services could not be seeded.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service, slug, category..." className="h-11 pl-11" />
        </label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={seedServices} disabled={isPending}>
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Seed fallback
        </Button>
      </div>

      {!visibleServices.length ? <AdminEmptyState title="No services found" description="Add a service, seed the current fallback data, or change the filters." /> : null}

      <div className="hidden overflow-hidden rounded-xl border border-slate-100 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleServices.map((service) => (
              <tr key={service.id}>
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-950">{service.title}</p>
                  <p className="font-mono text-xs text-slate-500">{service.slug}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{service.category?.name ?? "Uncategorized"}</td>
                <td className="px-4 py-3 text-slate-600">{service.is_paid === false ? "Free" : service.sale_price || service.offer_price ? `Rs ${service.sale_price ?? service.offer_price}` : service.price_label || "Enquiry"}</td>
                <td className="px-4 py-3"><AdminStatusBadge status={service.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/services/${service.slug}`} className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}><Eye className="h-4 w-4" /></Link>
                    <Link href={`/admin/services/${service.id}/edit`} className={cn(buttonVariants(), "h-9 px-3")}>Edit</Link>
                    <Button type="button" variant="outline" onClick={() => duplicateService(service)} className="h-9 px-3">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" onClick={() => updateStatus(service, service.status === "published" ? "draft" : "published")} className="h-9 px-3">
                      {service.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => archiveService(service)} className="h-9 px-3 text-red-600">
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleServices.map((service) => (
          <article key={service.id} className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">{service.title}</p>
                <p className="mt-1 text-sm text-slate-600">{service.category?.name ?? "Uncategorized"}</p>
              </div>
              <AdminStatusBadge status={service.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/admin/services/${service.id}/edit`} className={cn(buttonVariants(), "h-9 px-3")}>Edit</Link>
              <Button type="button" variant="outline" onClick={() => duplicateService(service)} className="h-9 px-3">Duplicate</Button>
              <Button type="button" variant="outline" onClick={() => updateStatus(service, service.status === "published" ? "draft" : "published")} className="h-9 px-3">
                {service.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button type="button" variant="outline" onClick={() => archiveService(service)} className="h-9 px-3 text-red-600">Archive</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
