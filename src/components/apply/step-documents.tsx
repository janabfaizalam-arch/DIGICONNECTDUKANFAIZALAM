"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { Camera, Check, Trash2, Upload } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { DOC_SLOTS } from "@/components/apply/shared";
import { cn } from "@/lib/utils";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 3 — the paperwork.
 *
 * Three slots, each either empty or filled; nothing here is mandatory, and the
 * step says so rather than letting a customer guess whether they are stuck.
 * Where the old screen offered "Upload" and "Camera" as equal buttons, the
 * camera leads on a phone — it is what people actually reach for — and the
 * file picker sits beside it.
 */
function Slot({
  slot,
  file,
  progress,
  error,
  onFileSelect,
  onCamera,
  onRemove,
}: {
  slot: (typeof DOC_SLOTS)[number];
  file: File | null;
  progress: number;
  error?: string | null;
  onFileSelect: (file: File) => void;
  onCamera: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const Icon = slot.icon;
  const uploading = progress > 0 && progress < 100;

  return (
    <PortalCard className={cn("transition duration-300", file && "ring-2 ring-emerald-400/40")}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: file ? "linear-gradient(155deg,#34d399,#059669)" : "var(--dc-grad-blue)" }}
          aria-hidden="true"
        >
          {file ? <Check className="h-[18px] w-[18px]" /> : <Icon className="h-[18px] w-[18px]" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold text-[var(--dc-ink)]">{slot.label}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--dc-ink)]/55">
            {file ? file.name : slot.hint}
          </p>
        </div>

        {file ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${slot.label}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--dc-ink)]/40 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {uploading ? (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--dc-blue-soft)]">
              <m.div
                className="h-full rounded-full"
                style={{ background: "var(--dc-grad-blue)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      {previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[var(--dc-ink)]/10">
          <Image
            src={previewUrl}
            alt={`${slot.label} preview`}
            width={640}
            height={400}
            unoptimized
            className="h-32 w-full object-cover"
          />
        </div>
      ) : null}

      {error ? <p className="mt-2.5 text-[12px] font-bold text-rose-600">{error}</p> : null}

      {!file ? (
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={onCamera}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-extrabold text-white transition duration-300 hover:brightness-110 active:scale-95"
            style={{ background: "var(--dc-grad-blue)" }}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Take a photo
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="lg-pill lg-raise inline-flex h-11 flex-1 items-center justify-center gap-2 text-[13px] font-extrabold text-[var(--dc-blue-mid)]"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) onFileSelect(chosen);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}
    </PortalCard>
  );
}

export function StepDocuments({ flow }: { flow: Flow }) {
  const { docFiles, uploadProgress, uploadErrors, handleFileChange, removeFile, openCamera } = flow;

  return (
    <div className="space-y-5">

      <div className="space-y-3">
        {DOC_SLOTS.map((slot) => (
          <Slot
            key={slot.id}
            slot={slot}
            file={docFiles[slot.id]}
            progress={uploadProgress[slot.id]}
            error={uploadErrors[slot.id]}
            onFileSelect={(file) => handleFileChange(slot.id, file)}
            onCamera={() => openCamera(slot.id)}
            onRemove={() => removeFile(slot.id)}
          />
        ))}
      </div>

      <p className="text-center text-[12px] font-semibold text-[var(--dc-ink)]/45">
        Files stay attached to this application only. Maximum 5 MB each.
      </p>
    </div>
  );
}
