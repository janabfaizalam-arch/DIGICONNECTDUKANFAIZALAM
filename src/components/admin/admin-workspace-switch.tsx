"use client";

import Link from "next/link";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ADMIN_WORKSPACES, type AdminWorkspaceId } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

/**
 * The toggle between the two halves of the panel.
 *
 * Customer work and partner work were interleaved in one sidebar, so finding
 * the applications queue meant reading past commission rules and payout
 * requests. This is the switch between them, and it is deliberately a real
 * navigation rather than a filter: choosing a workspace takes you to that
 * workspace's home, so the panel you are looking at always matches the one the
 * switch says you are in.
 */
export function AdminWorkspaceSwitch({
  active,
  collapsed,
  onNavigate,
}: {
  active: AdminWorkspaceId;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = ADMIN_WORKSPACES.find((workspace) => workspace.id === active) ?? ADMIN_WORKSPACES[0];
  const CurrentIcon = current.icon;

  /* Close on an outside click or Escape — a menu that traps you is worse than
     no menu. */
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (collapsed) {
    return (
      <Link
        href={current.id === "customer" ? ADMIN_WORKSPACES[1].home : ADMIN_WORKSPACES[0].home}
        title={`Switch to ${current.id === "customer" ? ADMIN_WORKSPACES[1].label : ADMIN_WORKSPACES[0].label}`}
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[0_10px_22px_-12px_rgba(0,29,95,0.9)]"
        style={{ background: "var(--dc-grad-blue)" }}
      >
        <CurrentIcon className="h-5 w-5" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="lg-card flex w-full items-center gap-2.5 p-2.5 text-left transition hover:-translate-y-px"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] text-white"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          <CurrentIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-flame)]">
            Workspace
          </span>
          <span className="block truncate text-[13.5px] font-extrabold leading-tight text-[var(--dc-ink)]">
            {current.label}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--dc-body)]" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="lg-card absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden p-1.5 shadow-[0_24px_60px_-20px_rgba(0,10,40,0.45)]"
          >
            {ADMIN_WORKSPACES.map((workspace) => {
              const Icon = workspace.icon;
              const isActive = workspace.id === active;

              return (
                <Link
                  key={workspace.id}
                  href={workspace.home}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl p-2.5 transition",
                    isActive ? "bg-[var(--dc-sky-soft)]" : "hover:bg-[var(--dc-sky-soft)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem]",
                      isActive ? "text-white" : "bg-[var(--dc-ink)]/6 text-[var(--dc-blue-mid)]",
                    )}
                    style={isActive ? { background: "var(--dc-grad-blue)" } : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-extrabold text-[var(--dc-ink)]">
                        {workspace.label}
                      </span>
                      {isActive ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">
                      {workspace.tagline}
                    </span>
                  </span>
                </Link>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
