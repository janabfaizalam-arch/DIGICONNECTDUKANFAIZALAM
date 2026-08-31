/**
 * Per-service extra questions on the application form.
 *
 * Every service is filed through the same flow, and that flow asks the six
 * things common to all of them: name, mobile, pincode, the city, district and
 * state the pincode resolves to, and the address. Nothing else, because
 * nothing else is common to all of them.
 *
 * Anything a particular service needs beyond that — a GSTIN, an assessment
 * year, a machinery list — is a row in `service_fields`, edited from the
 * Fields tab of the admin service editor. That table and that editor already
 * existed; they were simply never connected to the customer-facing form, so
 * the questions were configurable and invisible. Adding a question to a
 * service is now an admin edit rather than a deployment.
 *
 * This module is the translation between how the field is stored and how the
 * form renders it, and it is deliberately forgiving: a malformed row is
 * dropped rather than thrown, because a bad configuration must never stop
 * somebody applying.
 */

/** How the form renders a field, once its stored type is interpreted. */
export type ApplyFieldControl = "text" | "textarea" | "number" | "date" | "select" | "checkbox";

export type ApplyField = {
  /** `field_key` — the answer is stored under this. */
  id: string;
  label: string;
  control: ApplyFieldControl;
  required: boolean;
  placeholder?: string;
  help?: string;
  /** Choices, for `select` only. */
  options?: string[];
  /** Kept so the input can hint the right keyboard and pattern. */
  inputMode?: "numeric" | "tel" | "email";
  maxLength?: number;
};

/** The answers, keyed by field id. A checkbox stores "Yes" or "". */
export type ApplyFieldValues = Record<string, string>;

/**
 * How each stored `field_type` behaves on the form.
 *
 * `address` is the table's name for a multi-line box. `file_upload` is
 * deliberately absent: documents are the flow's own step, and a service that
 * wants a fourth file is asking for a change to that step, not a text input
 * that pretends to be one.
 */
const CONTROLS: Record<string, Omit<ApplyField, "id" | "label" | "required">> = {
  text: { control: "text" },
  number: { control: "number", inputMode: "numeric" },
  mobile: { control: "text", inputMode: "tel", maxLength: 10 },
  email: { control: "text", inputMode: "email" },
  date: { control: "date" },
  dropdown: { control: "select" },
  radio: { control: "select" },
  checkbox: { control: "checkbox" },
  address: { control: "textarea" },
  aadhaar: { control: "text", inputMode: "numeric", maxLength: 12 },
  pan: { control: "text", maxLength: 10 },
  gstin: { control: "text", maxLength: 15 },
};

/** The row as it comes back from `service_fields`. */
export type ServiceFieldRow = {
  field_key?: unknown;
  label?: unknown;
  field_type?: unknown;
  sort_order?: unknown;
  validation_chains?: unknown;
  options?: unknown;
  placeholder?: unknown;
  help_text?: unknown;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

/**
 * Parse a JSON column that may not be JSON.
 *
 * These columns arrive as an array on `jsonb` and as a string on `text`,
 * depending on how the column was created. Calling `.some` or `.map` on a
 * string throws, and inside a server render that takes the whole page down.
 */
function asArray(value: unknown): unknown[] {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/** A field is required when its validation chain says so. */
function isRequired(chains: unknown) {
  return asArray(chains).some(
    (rule) => rule && typeof rule === "object" && (rule as { rule?: unknown }).rule === "required",
  );
}

/** Turn stored rows into what the form renders, dropping anything unusable. */
export function toApplyFields(rows: ServiceFieldRow[]): ApplyField[] {
  const fields: ApplyField[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const id = asString(row.field_key).trim();
    const label = asString(row.label).trim();
    if (!id || !label || seen.has(id)) continue;

    const type = asString(row.field_type, "text");
    if (type === "file_upload") continue;

    const shape = CONTROLS[type] ?? CONTROLS.text;
    const options = asArray(row.options)
      .map((option) => asString(option).trim())
      .filter(Boolean);

    seen.add(id);
    fields.push({
      ...shape,
      id,
      label,
      required: isRequired(row.validation_chains),
      placeholder: asString(row.placeholder).trim() || undefined,
      help: asString(row.help_text).trim() || undefined,
      // A dropdown with nothing to choose from is a text box.
      control: shape.control === "select" && !options.length ? "text" : shape.control,
      options: options.length ? options : undefined,
    });
  }

  return fields;
}

/**
 * Which required fields have not been answered.
 *
 * Keyed by field id into the same map the base fields use, so the shell's
 * "scroll to the first invalid input" behaviour finds a configured field
 * without knowing it is configured.
 */
export function validateApplyFields(
  fields: ApplyField[],
  values: ApplyFieldValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!field.required) continue;
    if (!String(values[field.id] ?? "").trim()) {
      errors[field.id] = `${field.label} is required.`;
    }
  }

  return errors;
}

/**
 * The answers worth sending, labelled.
 *
 * Stored against the application under the question that was asked rather
 * than its key, so whoever processes the file still reads it correctly after
 * the field is renamed or removed in admin.
 */
export function collectApplyAnswers(
  fields: ApplyField[],
  values: ApplyFieldValues,
): Record<string, string> {
  const answers: Record<string, string> = {};

  for (const field of fields) {
    const answer = String(values[field.id] ?? "").trim();
    if (answer) answers[field.label] = answer;
  }

  return answers;
}
