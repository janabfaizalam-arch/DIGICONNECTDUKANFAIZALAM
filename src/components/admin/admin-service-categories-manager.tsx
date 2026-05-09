"use client";

import { FormEvent, useState, useTransition } from "react";
import { LoaderCircle, Plus, Save } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DbServiceCategory } from "@/lib/services";

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

export function AdminServiceCategoriesManager({ categories }: { categories: DbServiceCategory[] }) {
  const [editing, setEditing] = useState<DbServiceCategory | null>(null);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/service-categories", { method: "POST", body: formData });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Category could not be saved.");
        success(result.message ?? "Category saved.");
        setEditing(null);
        window.location.reload();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Category could not be saved.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Categories</h2>
          <p className="mt-1 text-sm text-slate-600">Manage service category names, slugs, and availability.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setEditing({ id: "", name: "", slug: "", description: "", sort_order: 0, is_active: true, created_at: "", updated_at: "" })}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setEditing(category)}
            className="rounded-xl border border-slate-100 p-3 text-left transition hover:bg-blue-50"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-slate-950">{category.name}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${category.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {category.is_active ? "Active" : "Hidden"}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">{category.slug}</p>
          </button>
        ))}
      </div>

      {editing ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
          {editing.id ? <input type="hidden" name="id" value={editing.id} /> : null}
          <Input
            name="name"
            defaultValue={editing.name}
            placeholder="Category name"
            required
            onBlur={(event) => {
              const form = event.currentTarget.form;
              const slug = form?.elements.namedItem("slug") as HTMLInputElement | null;
              if (slug && !slug.value) slug.value = slugify(event.currentTarget.value);
            }}
          />
          <Input name="slug" defaultValue={editing.slug} placeholder="category-slug" required />
          <Input name="description" defaultValue={editing.description ?? ""} placeholder="Description" className="md:col-span-2" />
          <Input name="sortOrder" type="number" defaultValue={editing.sort_order} placeholder="Sort order" />
          <select name="isActive" defaultValue={String(editing.is_active)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="true">Active</option>
            <option value="false">Hidden</option>
          </select>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Category
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
