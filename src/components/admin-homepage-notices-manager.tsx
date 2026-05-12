"use client";

import { type FormEvent, useRef, useState } from "react";
import { BellRing, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { homepageNoticeColorThemes, type HomepageNotice, type HomepageNoticeColorTheme } from "@/lib/homepage-notice-shared";
import { cn } from "@/lib/utils";

type ApiResponse = {
  notice?: HomepageNotice;
  message?: string;
  error?: string;
};

type AdminHomepageNoticesManagerProps = {
  initialNotices: HomepageNotice[];
};

const themeLabels: Record<HomepageNoticeColorTheme, string> = {
  "blue-orange": "Blue + Orange",
  blue: "Blue",
  orange: "Orange",
  green: "Green",
  slate: "Slate",
};

const themeBadgeClasses: Record<HomepageNoticeColorTheme, string> = {
  "blue-orange": "bg-orange-50 text-orange-700 ring-orange-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

function getResponseMessage(data: ApiResponse, fallback: string) {
  return data.error || data.message || fallback;
}

function sortNotices(notices: HomepageNotice[]) {
  return [...notices].sort((a, b) => a.sort_order - b.sort_order || Date.parse(b.created_at) - Date.parse(a.created_at));
}

function NoticeFields({ notice, disabled }: { notice?: HomepageNotice; disabled?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_7rem]">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Notice text</span>
          <Input name="notice_text" defaultValue={notice?.notice_text ?? ""} placeholder="ITR + MSME Combo Rs 699" required maxLength={120} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Emoji/Icon</span>
          <Input name="emoji_icon" defaultValue={notice?.emoji_icon ?? ""} placeholder="🔥" maxLength={8} disabled={disabled} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_10rem_8rem]">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Optional link</span>
          <Input name="link_url" defaultValue={notice?.link_url ?? ""} placeholder="/services or https://..." disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Highlight color</span>
          <select
            name="color_theme"
            defaultValue={notice?.color_theme ?? "blue-orange"}
            disabled={disabled}
            className="h-12 rounded-xl border border-blue-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none ring-blue-500/20 focus:ring-4"
          >
            {homepageNoticeColorThemes.map((theme) => (
              <option key={theme} value={theme}>
                {themeLabels[theme]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Sort order</span>
          <Input name="sort_order" type="number" defaultValue={notice?.sort_order ?? 0} disabled={disabled} />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm font-bold text-slate-700">
        <input name="is_active" type="checkbox" value="true" defaultChecked={notice?.is_active ?? true} disabled={disabled} className="h-4 w-4 accent-blue-700" />
        Active on homepage
      </label>
      <input type="hidden" name="is_active" value="false" />
    </div>
  );
}

export function AdminHomepageNoticesManager({ initialNotices }: AdminHomepageNoticesManagerProps) {
  const [notices, setNotices] = useState(sortNotices(initialNotices));
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/homepage-notices", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.notice) {
        setErrorMessage(getResponseMessage(data, "Homepage notice could not be created."));
        return;
      }

      setNotices((currentNotices) => sortNotices([data.notice!, ...currentNotices]));
      setSuccessMessage(data.message || "Homepage notice created successfully.");
      formRef.current?.reset();
    } catch (error) {
      console.error("[admin/homepage-notices] Create failed", error);
      setErrorMessage("Homepage notice could not be created. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, notice: HomepageNotice) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setEditingId(notice.id);

    try {
      const response = await fetch(`/api/admin/homepage-notices/${notice.id}`, {
        method: "PATCH",
        body: new FormData(event.currentTarget),
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.notice) {
        setErrorMessage(getResponseMessage(data, "Homepage notice could not be updated."));
        return;
      }

      setNotices((currentNotices) => sortNotices(currentNotices.map((item) => (item.id === notice.id ? data.notice! : item))));
      setSuccessMessage(data.message || "Homepage notice updated successfully.");
    } catch (error) {
      console.error("[admin/homepage-notices] Update failed", error);
      setErrorMessage("Homepage notice could not be updated. Please try again.");
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(notice: HomepageNotice) {
    if (!window.confirm("Delete this homepage notice?")) {
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setDeletingId(notice.id);

    try {
      const response = await fetch(`/api/admin/homepage-notices/${notice.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(getResponseMessage(data, "Homepage notice could not be deleted."));
        return;
      }

      setNotices((currentNotices) => currentNotices.filter((item) => item.id !== notice.id));
      setSuccessMessage(data.message || "Homepage notice deleted successfully.");
    } catch (error) {
      console.error("[admin/homepage-notices] Delete failed", error);
      setErrorMessage("Homepage notice could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 p-4 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Create notice</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Add a compact homepage offer chip with optional internal or external link.</p>
          </div>
        </div>

        <form ref={formRef} onSubmit={(event) => void handleCreate(event)} className="space-y-5">
          <NoticeFields disabled={isCreating} />
          <Button type="submit" className="h-12" disabled={isCreating}>
            {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isCreating ? "Creating..." : "Create Notice"}
          </Button>
        </form>

        {successMessage ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}
        {errorMessage ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
      </Card>

      <div className="space-y-4">
        {notices.length ? (
          notices.map((notice) => (
            <Card key={notice.id} className="border-blue-100 p-4 shadow-sm md:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold ring-1", notice.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-600 ring-slate-200")}>
                      {notice.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold ring-1", themeBadgeClasses[notice.color_theme])}>{themeLabels[notice.color_theme]}</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">Order {notice.sort_order}</span>
                  </div>
                  <p className="mt-3 text-base font-bold text-slate-950">
                    {notice.emoji_icon ? `${notice.emoji_icon} ` : ""}
                    {notice.notice_text}
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-600">Link: {notice.link_url || "Not linked"}</p>
                </div>

                <Button type="button" variant="outline" className="text-red-600" disabled={deletingId === notice.id} onClick={() => void handleDelete(notice)}>
                  <Trash2 className="h-4 w-4" />
                  {deletingId === notice.id ? "Deleting..." : "Delete"}
                </Button>
              </div>

              <form onSubmit={(event) => void handleUpdate(event, notice)} className="space-y-5">
                <NoticeFields notice={notice} disabled={editingId === notice.id} />
                <Button type="submit" variant="outline" className="w-full md:w-auto" disabled={editingId === notice.id}>
                  {editingId === notice.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                  {editingId === notice.id ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Card>
          ))
        ) : (
          <AdminEmptyState title="No homepage notices yet" description="Create the first offer notice from the form above." />
        )}
      </div>
    </div>
  );
}
