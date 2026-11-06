"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Sparkles, TriangleAlert, Upload, X } from "lucide-react";

import { AdminButton, AdminField, AdminInput } from "@/components/admin/primitives/controls-ui";
import { AdminCard, AdminSection } from "@/components/admin/primitives/layout";
import { STATUS_TONE_CLASS, STATUS_TONE_TEXT } from "@/lib/admin/status-tone";
import {
  DOC_LABELS,
  UPLOAD_ACCEPT,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_FILES,
  crossCheckNotes,
  mergeSuggestions,
  type Confidence,
  type DocumentInfo,
  type ExtractResult,
  type FillableKey,
  type MergedSuggestion,
  type Suggestion,
} from "@/lib/balance-sheets/autofill";
import { FIELD_LABELS, type FieldKey } from "@/lib/balance-sheets/checks";
import { cn } from "@/lib/utils";

/**
 * "Documents se bharein": upload a customer's ITR, AIS, TIS, 26AS, tax
 * computation or DPR, let the server read them, and review every figure
 * before it goes into the form. Each file goes up on its own request (the
 * hosting platform refuses bodies over 4.5 MB), one after another.
 */

const EXTRA_LABELS: Record<string, string> = {
  baseYear: "Last completed financial year",
  natureOfBusiness: "Nature of business",
  address: "Business address",
  city: "City",
  state: "State",
  udyamNumber: "Udyam registration no.",
  bankName: "Bank and branch",
  loanPurpose: "Purpose of loan",
};

export const fillableLabel = (key: FillableKey) => FIELD_LABELS[key as FieldKey] ?? EXTRA_LABELS[key] ?? key;

const CONFIDENCE_LABEL: Record<Confidence, { text: string; tone: "success" | "warning" | "neutral" }> = {
  high: { text: "Pakka", tone: "success" },
  medium: { text: "Shayad", tone: "warning" },
  low: { text: "Kam bharosa", tone: "neutral" },
};

type FileState = {
  key: string;
  file: File;
  status: "waiting" | "reading" | "done" | "error";
  message?: string;
  found?: number;
};

export type AutofillItem = { field: FillableKey; value: string; source: string };

export function sourceLabel(suggestion: Suggestion, documents: DocumentInfo[]) {
  const doc = documents.find((entry) => entry.fileName === suggestion.fileName);
  const period = doc?.period ? ` ${doc.period}` : "";
  return `${DOC_LABELS[suggestion.docType]}${period}`;
}

const formatValue = (field: FillableKey, value: string) => {
  if (/^\d+(\.\d+)?$/.test(value) && !["baseYear", "pincode", "mobile"].includes(field) && !field.endsWith("Pct") && !field.endsWith("Years")) {
    return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return value;
};

export function BalanceSheetAutofill({
  currentValue,
  onApply,
}: {
  currentValue: (field: FillableKey) => string;
  onApply: (items: AutofillItem[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileState[]>([]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ExtractResult[]>([]);
  const [selected, setSelected] = useState<Set<FillableKey>>(new Set());
  const [applied, setApplied] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const documents = useMemo(() => results.flatMap((result) => result.documents), [results]);
  const merged = useMemo(() => mergeSuggestions(results.flatMap((result) => result.suggestions)), [results]);
  // Each file is read on its own request, so comparing documents (ITR sales
  // against AIS turnover) can only happen here, once all of them are in.
  const notes = useMemo(
    () => Array.from(new Set([...results.flatMap((result) => result.notes), ...crossCheckNotes(results.flatMap((result) => result.suggestions))])),
    [results],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    setProblem(null);
    const incoming = Array.from(list);
    const tooBig = incoming.filter((file) => file.size > UPLOAD_MAX_BYTES).map((file) => file.name);
    const ok = incoming.filter((file) => file.size <= UPLOAD_MAX_BYTES);
    setFiles((current) => {
      const next = [...current];
      for (const file of ok) {
        if (next.length >= UPLOAD_MAX_FILES) break;
        if (next.some((entry) => entry.file.name === file.name && entry.file.size === file.size)) continue;
        next.push({ key: `${file.name}-${file.size}-${file.lastModified}`, file, status: "waiting" });
      }
      return next;
    });
    if (tooBig.length) setProblem(`${tooBig.join(", ")}: 4 MB se badi file nahi le sakte. Sirf zaroori pages ki PDF banayein.`);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function readAll() {
    setBusy(true);
    setApplied(null);
    setProblem(null);
    const collected: ExtractResult[] = [...results];
    for (const entry of files) {
      if (entry.status === "done") continue;
      setFiles((current) => current.map((item) => (item.key === entry.key ? { ...item, status: "reading", message: undefined } : item)));
      const body = new FormData();
      body.append("file", entry.file);
      if (password.trim()) body.append("password", password.trim());
      try {
        const response = await fetch("/api/admin/balance-sheets/extract", { method: "POST", body });
        const data = (await response.json().catch(() => ({}))) as Partial<ExtractResult> & { message?: string };
        if (!response.ok || !data.suggestions) {
          setFiles((current) =>
            current.map((item) => (item.key === entry.key ? { ...item, status: "error", message: data.message ?? "Ye file padhi nahi ja saki." } : item)),
          );
          continue;
        }
        const result: ExtractResult = { documents: data.documents ?? [], suggestions: data.suggestions, notes: data.notes ?? [] };
        collected.push(result);
        setFiles((current) => current.map((item) => (item.key === entry.key ? { ...item, status: "done", found: result.suggestions.length } : item)));
      } catch {
        setFiles((current) => current.map((item) => (item.key === entry.key ? { ...item, status: "error", message: "Internet connection nahi hai." } : item)));
      }
    }
    setResults(collected);
    // Tick what is worth using by default: not low confidence, and different from what is in the form.
    const next = new Set<FillableKey>();
    for (const suggestion of mergeSuggestions(collected.flatMap((result) => result.suggestions))) {
      if (suggestion.confidence !== "low" && currentValue(suggestion.field).replace(/,/g, "") !== suggestion.value) next.add(suggestion.field);
    }
    setSelected(next);
    setBusy(false);
  }

  function apply() {
    const items = merged
      .filter((suggestion) => selected.has(suggestion.field))
      .map((suggestion) => ({ field: suggestion.field, value: suggestion.value, source: sourceLabel(suggestion, documents) }));
    onApply(items);
    setApplied(items.length);
  }

  function reset() {
    setFiles([]);
    setResults([]);
    setSelected(new Set());
    setApplied(null);
    setProblem(null);
  }

  const toggle = (field: FillableKey) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });

  const pending = files.some((entry) => entry.status === "waiting" || entry.status === "error");

  return (
    <AdminCard>
      <AdminSection
        title="Documents se bharein (AI)"
        description="Customer ki ITR, AIS, TIS, 26AS, tax computation ya DPR upload karein. AI figures nikalega; aap har figure dekh kar tick karenge, tabhi form mein bharega."
      >
        <div className="flex flex-col gap-3">
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-ds-lg border-2 border-dashed border-ds-border bg-ds-surface-sunken px-4 py-6 text-center text-[13px] text-ds-text-secondary hover:border-ds-border-strong focus-within:ring-2 focus-within:ring-ds-focus"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-ds-text-primary">Files chunein ya yahan chhodein</span>
            <span>PDF, ITR JSON, TXT, ya photo (JPG/PNG) · har file 4 MB tak · {UPLOAD_MAX_FILES} files tak</span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              multiple
              accept={UPLOAD_ACCEPT}
              className="sr-only"
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>

          {files.length ? (
            <ul className="divide-y divide-ds-border rounded-ds-md border border-ds-border text-[13px]" aria-label="Chuni hui files">
              {files.map((entry) => (
                <li key={entry.key} className="flex items-start gap-2 px-3 py-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ds-text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ds-text-primary">{entry.file.name}</span>
                    {entry.status === "waiting" ? <span className="text-ds-text-muted">Padhna baaki hai</span> : null}
                    {entry.status === "reading" ? (
                      <span className="inline-flex items-center gap-1 text-ds-text-muted">
                        <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Padh raha hai…
                      </span>
                    ) : null}
                    {entry.status === "done" ? (
                      <span className={STATUS_TONE_TEXT.success}>{entry.found ? `${entry.found} figure mile` : "Koi figure nahi mila"}</span>
                    ) : null}
                    {entry.status === "error" ? <span className={STATUS_TONE_TEXT.danger}>{entry.message}</span> : null}
                  </span>
                  {!busy && entry.status !== "reading" ? (
                    <button
                      type="button"
                      className="rounded-ds-sm p-1 text-ds-text-muted hover:bg-ds-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                      aria-label={`${entry.file.name} hatayein`}
                      onClick={() => setFiles((current) => current.filter((item) => item.key !== entry.key))}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <AdminField label="PDF ka password (agar band hai)" htmlFor={`${inputId}-password`} help="AIS / TIS / 26AS: PAN chhote akshar mein + janam tithi DDMMYYYY, jaise abcde1234f01011990">
              <AdminInput
                id={`${inputId}-password`}
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={`${inputId}-password-help`}
              />
            </AdminField>
            <AdminButton variant="primary" onClick={readAll} loading={busy} disabled={busy || !pending}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Padho aur figures nikalo
            </AdminButton>
          </div>

          <p className="text-[12px] leading-snug text-ds-text-muted">
            Files kahin save nahi hoti. Padhne ke liye unka text (ya scan ki hui file) Google Gemini AI ko bheja jaata hai. AI galti kar sakta hai, isliye har figure
            document se milakar hi bharein.
          </p>

          {problem ? (
            <p role="alert" className={cn("text-[13px] font-semibold", STATUS_TONE_TEXT.danger)}>
              {problem}
            </p>
          ) : null}

          {notes.length ? (
            <ul className="space-y-1 rounded-ds-md p-3 text-[13px]" aria-label="Documents ke baare mein notes">
              {notes.map((note) => (
                <li key={note} className={cn("flex gap-1.5", STATUS_TONE_TEXT.warning)}>
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-ds-text-secondary">{note}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {merged.length ? (
            <ReviewTable merged={merged} documents={documents} selected={selected} toggle={toggle} currentValue={currentValue} />
          ) : null}

          {merged.length ? (
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton variant="primary" onClick={apply} disabled={selected.size === 0}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Chune hue {selected.size} figure form mein bharein
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setSelected(new Set(merged.map((suggestion) => suggestion.field)))}>
                Sab chunein
              </AdminButton>
              <AdminButton variant="ghost" onClick={reset}>
                Sab hatayein
              </AdminButton>
              <span role="status" className={cn("text-[13px] font-semibold", STATUS_TONE_TEXT.success)}>
                {applied !== null ? `${applied} figure form mein bhar diye. Neeche har box check karein; bhare hue box par "Document se bhara" likha hai.` : ""}
              </span>
            </div>
          ) : null}
        </div>
      </AdminSection>
    </AdminCard>
  );
}

function ReviewTable({
  merged,
  documents,
  selected,
  toggle,
  currentValue,
}: {
  merged: MergedSuggestion[];
  documents: DocumentInfo[];
  selected: Set<FillableKey>;
  toggle: (field: FillableKey) => void;
  currentValue: (field: FillableKey) => string;
}) {
  return (
    <div className="overflow-x-auto touch-pan-y rounded-ds-md border border-ds-border" data-testid="autofill-review">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <caption className="border-b border-ds-border px-3 py-2 text-left font-bold text-ds-text-primary">Documents se mile figures</caption>
        <thead>
          <tr className="bg-ds-surface-sunken">
            <th scope="col" className="w-10 px-3 py-2 text-left">
              <span className="sr-only">Chunein</span>
            </th>
            <th scope="col" className="px-3 py-2 text-left font-bold">Box</th>
            <th scope="col" className="px-3 py-2 text-right font-bold">Document mein</th>
            <th scope="col" className="px-3 py-2 text-right font-bold">Abhi form mein</th>
            <th scope="col" className="px-3 py-2 text-left font-bold">Kahan se</th>
            <th scope="col" className="px-3 py-2 text-left font-bold">Bharosa</th>
          </tr>
        </thead>
        <tbody>
          {merged.map((suggestion) => {
            const current = currentValue(suggestion.field);
            const same = current.replace(/,/g, "") === suggestion.value;
            const confidence = CONFIDENCE_LABEL[suggestion.confidence];
            const checkboxId = `autofill-${suggestion.field.replace(".", "-")}`;
            return (
              <tr key={suggestion.field} className="border-t border-ds-border align-top">
                <td className="px-3 py-2">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="h-4 w-4 accent-ds-primary"
                    checked={selected.has(suggestion.field)}
                    onChange={() => toggle(suggestion.field)}
                  />
                </td>
                <td className="px-3 py-2">
                  <label htmlFor={checkboxId} className="font-semibold text-ds-text-primary">
                    {fillableLabel(suggestion.field)}
                  </label>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ds-text-primary">{formatValue(suggestion.field, suggestion.value)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ds-text-muted">
                  {current ? formatValue(suggestion.field, current.replace(/,/g, "")) : "khaali"}
                  {same ? <span className="sr-only"> (same)</span> : null}
                </td>
                <td className="px-3 py-2 text-ds-text-secondary">
                  <span className="font-semibold">{sourceLabel(suggestion, documents)}</span>
                  <span className="block text-[12px] text-ds-text-muted">{suggestion.fileName}</span>
                  {suggestion.evidence ? <q className="mt-0.5 block text-[12px] italic">{suggestion.evidence}</q> : null}
                  {suggestion.alternatives.length ? (
                    <span className={cn("mt-0.5 block text-[12px] font-semibold", STATUS_TONE_TEXT.warning)}>
                      Dusre document mein alag:{" "}
                      {suggestion.alternatives.map((other) => `${sourceLabel(other, documents)} ${formatValue(other.field, other.value)}`).join(", ")}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_TONE_CLASS[confidence.tone])}>{confidence.text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
