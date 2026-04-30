"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastVariant = "default" | "success" | "error";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: Omit<Toast, "id">) => {
    if (typeof window === "undefined") {
      return;
    }

    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, ...input }]);

    setTimeout(() => {
      dismiss(id);
    }, 4000);
  }, [dismiss]);

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "success" }),
    [toast],
  );

  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "error" }),
    [toast],
  );

  const value = useMemo(
    () => ({
      toasts,
      toast,
      success,
      error,
      dismiss,
    }),
    [dismiss, error, success, toast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-3">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-3 rounded-3xl border bg-white p-4 shadow-soft"
            role="status"
            aria-live="polite"
          >
            {item.variant === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : item.variant === "error" ? (
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            )}
            <div className="flex-1">
              {item.title ? <p className="text-sm font-medium text-slate-700">{item.title}</p> : null}
              {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
