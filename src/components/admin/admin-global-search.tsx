"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

type SearchResult = { id: string; title: string; subtitle: string; href: string };
type SearchGroup = { type: string; label: string; results: SearchResult[] };

export function AdminGlobalSearch({
  className,
  autoFocus,
  placeholder = "Search applications, customers, partners…",
}: {
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGroups([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    const handle = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setGroups(Array.isArray(data.groups) ? data.groups : []);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setGroups([]);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(handle);
  }, [query]);

  const total = groups.reduce((n, g) => n + g.results.length, 0);

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-md", className)}>
      <label htmlFor={inputId} className="sr-only">
        Search CRM
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        ref={inputRef}
        id={inputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="h-10 w-full truncate rounded-full border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs font-medium text-slate-700 outline-none transition placeholder:truncate focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        autoComplete="off"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => {
            setQuery("");
            setGroups([]);
            setOpen(false);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-[min(28rem,70vh)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs font-semibold text-slate-500">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : error ? (
            <p className="px-3 py-4 text-xs font-semibold text-rose-600">{error}</p>
          ) : total === 0 ? (
            <p className="px-3 py-4 text-xs font-semibold text-slate-500">No matches for “{query.trim()}”.</p>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.type}>
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>
                  <ul className="space-y-0.5">
                    {group.results.map((item) => (
                      <li key={`${group.type}-${item.id}`}>
                        <Link
                          href={item.href}
                          className="block rounded-xl px-3 py-2 hover:bg-slate-50"
                          onClick={() => {
                            setOpen(false);
                            startTransition(() => router.push(item.href));
                          }}
                        >
                          <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="truncate text-[11px] text-slate-500">{item.subtitle}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
