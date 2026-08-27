"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, FolderOpen, Loader2, ShieldCheck, UploadCloud, X } from "lucide-react";

import { Reveal } from "@/components/homepage/motion";
import { CustomerVault } from "@/components/portal/customer-vault";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

import type { CustomerPortalData } from "@/components/customer/types";
import {
  EmptyState,
  PortalButton,
  PortalCard,
  PortalHeading,
  PortalIcon,
  formatDate,
} from "@/components/customer/ui";

/**
 * Documents.
 *
 * "Documents Hub" and "Secure Vault" were separate tabs, and neither name told
 * a customer which one held what. They are genuinely different things, so they
 * are still separate — but as two labelled parts of one section, with the
 * difference spelled out rather than left to the names:
 *
 *   • Application files — what you sent us for a specific filing, and what we
 *     have sent back.
 *   • Your vault — identity documents you keep once and reuse, so the next
 *     application does not ask for your Aadhaar again.
 */

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Extensions the storage bucket accepts, in the words a customer uses. */
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp";

export function DocumentsSection({ applications, documents = [], user }: CustomerPortalData) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [applicationId, setApplicationId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Applications still open — you cannot usefully upload to a closed one. */
  const openApplications = useMemo(
    () =>
      applications.filter(
        (application) =>
          !["completed", "delivered", "cancelled", "refunded"].includes(String(application.status ?? "").toLowerCase()),
      ),
    [applications],
  );

  const byApplication = useMemo(() => {
    const names = new Map(applications.map((application) => [application.id, application.service_name]));
    const groups = new Map<string, { name: string; files: typeof documents }>();

    for (const document of documents) {
      const key = document.application_id;
      const group = groups.get(key) ?? { name: names.get(key) ?? "Application", files: [] };
      group.files.push(document);
      groups.set(key, group);
    }

    return [...groups.entries()].map(([id, group]) => ({ id, ...group }));
  }, [documents, applications]);

  const chooseFile = (next: File | null) => {
    if (next && next.size > MAX_UPLOAD_BYTES) {
      toastError("That file is larger than 10 MB. Please compress it and try again.");
      return;
    }
    setFile(next);
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (uploading) return;

    if (!applicationId || !documentName.trim() || !file) {
      toastError("Choose an application, name the document, and pick a file.");
      return;
    }

    setUploading(true);
    let storagePath = "";

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Could not reach storage. Please try again.");

      const extension = file.name.split(".").pop() ?? "bin";
      const unique = Math.random().toString(36).slice(2, 12);
      storagePath = `portal-uploads/${user.id}/${applicationId}/${unique}.${extension}`;

      const { error: storageError } = await supabase.storage
        .from("application-documents")
        .upload(storagePath, file, { cacheControl: "3600", upsert: true });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("application-documents").getPublicUrl(storagePath);
      if (!urlData?.publicUrl) throw new Error("Upload finished but the file could not be linked.");

      const { error: rowError } = await supabase.from("application_documents").insert({
        application_id: applicationId,
        document_type: documentName.trim(),
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        storage_path: storagePath,
        status: "pending",
        review_status: "pending",
        uploaded_by_role: "customer",
      });

      if (rowError) {
        // Leaving the object behind would put a file in the bucket that no
        // application knows about, and nobody would ever clean it up.
        await supabase.storage.from("application-documents").remove([storagePath]);
        throw rowError;
      }

      toastSuccess("Document uploaded. Our team will review it.");
      setFile(null);
      setDocumentName("");
      setApplicationId("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Upload ───────────────────────────────────────────────────── */}
      <section aria-labelledby="upload-heading">
        <PortalHeading
          eyebrow="Application files"
          title="Send us a document"
          description="Upload what a filing needs. We review every file before it goes any further."
        />
        <h2 id="upload-heading" className="sr-only">
          Upload a document
        </h2>

        {openApplications.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={<UploadCloud className="h-5 w-5" aria-hidden="true" />}
              title="No open application to upload to"
              description="Documents attach to a specific filing. Start an application and this is where you will send its paperwork."
              actionHref="/apply"
              actionLabel="Browse services"
            />
          </div>
        ) : (
          <PortalCard className="mt-5">
            <form onSubmit={upload} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    Application
                  </span>
                  <select
                    value={applicationId}
                    onChange={(event) => setApplicationId(event.target.value)}
                    required
                    className="h-11 rounded-xl border border-[var(--dc-blue-bright)]/18 bg-white px-3 text-[13.5px] font-semibold text-[var(--dc-ink)] outline-none transition focus:border-[var(--dc-blue-bright)]"
                  >
                    <option value="">Choose one</option>
                    {openApplications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.service_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    What is it?
                  </span>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(event) => setDocumentName(event.target.value)}
                    required
                    maxLength={60}
                    placeholder="e.g. PAN card, rent agreement"
                    className="h-11 rounded-xl border border-[var(--dc-blue-bright)]/18 bg-white px-3 text-[13.5px] font-semibold text-[var(--dc-ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--dc-muted)] focus:border-[var(--dc-blue-bright)]"
                  />
                </label>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={cn(
                  "rounded-xl border-2 border-dashed p-5 text-center transition",
                  dragging
                    ? "border-[var(--dc-flame)] bg-[var(--dc-orange-soft)]"
                    : "border-[var(--dc-blue-bright)]/25 bg-[var(--dc-blue-soft)]/50",
                )}
              >
                <input
                  ref={inputRef}
                  id="document-file"
                  type="file"
                  accept={ACCEPTED}
                  onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <PortalIcon tone="blue">
                      <FileText className="h-[17px] w-[17px]" aria-hidden="true" />
                    </PortalIcon>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[13px] font-extrabold text-[var(--dc-ink)]">{file.name}</p>
                      <p className="text-[11.5px] font-semibold text-[var(--dc-muted)]">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      aria-label="Remove selected file"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--dc-muted)] transition hover:bg-white"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="document-file" className="block cursor-pointer">
                    <UploadCloud className="mx-auto h-7 w-7 text-[var(--dc-blue-mid)]" aria-hidden="true" />
                    <p className="mt-2 text-[13.5px] font-extrabold text-[var(--dc-ink)]">
                      Tap to choose a file, or drop it here
                    </p>
                    <p className="mt-1 text-[11.5px] font-semibold text-[var(--dc-muted)]">
                      PDF, JPG, PNG or WEBP · up to 10 MB
                    </p>
                  </label>
                )}
              </div>

              <PortalButton type="submit" disabled={uploading} className="w-full sm:w-auto">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" aria-hidden="true" />
                    Upload document
                  </>
                )}
              </PortalButton>
            </form>
          </PortalCard>
        )}
      </section>

      {/* ── Files on your applications ───────────────────────────────── */}
      <Reveal>
        <section aria-labelledby="files-heading">
          <PortalHeading eyebrow="On file" title="Your application documents" />
          <h2 id="files-heading" className="sr-only">
            Documents on your applications
          </h2>

          {byApplication.length ? (
            <div className="mt-5 space-y-3">
              {byApplication.map((group) => (
                <PortalCard key={group.id}>
                  <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">{group.name}</p>
                  <ul className="mt-3 space-y-2">
                    {group.files.map((document) => (
                      <li
                        key={document.id}
                        className="flex items-center gap-3 rounded-xl bg-[var(--dc-blue-soft)]/60 px-3 py-2.5"
                      >
                        <PortalIcon tone="muted" className="h-9 w-9 rounded-[0.7rem]">
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        </PortalIcon>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-extrabold text-[var(--dc-ink)]">
                            {document.document_name || document.document_type || document.file_name}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[var(--dc-muted)]">
                            {document.uploaded_by_role === "customer" ? "You sent this" : "We sent this"} ·{" "}
                            {formatDate(document.uploaded_at || document.created_at)}
                          </p>
                        </div>
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lg-pill lg-raise inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-[12px] font-extrabold text-[var(--dc-blue-mid)]"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                </PortalCard>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
                title="No documents yet"
                description="Files you send us, and files we send back, both appear here grouped by application."
              />
            </div>
          )}
        </section>
      </Reveal>

      {/* ── Vault ────────────────────────────────────────────────────── */}
      <Reveal>
        <section id="vault" className="scroll-mt-24" aria-labelledby="vault-heading">
          <PortalHeading
            eyebrow="Secure vault"
            title="Documents you reuse"
            description="Save your identity documents once. Every future application can draw on them instead of asking again."
          />
          <h2 id="vault-heading" className="sr-only">
            Secure vault
          </h2>

          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[var(--dc-blue-soft)] px-3.5 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
            <p className="text-[12px] font-semibold leading-snug text-[var(--dc-body)]">
              Vault files are stored for your applications only, and are never shared outside the assistance we
              provide you.
            </p>
          </div>

          <div className="mt-4">
            <CustomerVault user={user} hideHeader />
          </div>
        </section>
      </Reveal>
    </div>
  );
}
