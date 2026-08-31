// ============================================================================
// DigiPartner DS-OS: Universal Service & Form Engine Core
// DigiConnect Dukan — 2026-06-13
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface ValidationRule {
  rule: "required" | "minLength" | "maxLength" | "pattern" | "email" | "mobile" | "aadhaar" | "pan" | "gstin";
  val?: unknown;
  msg?: string;
}

export interface ServiceField {
  id: string;
  service_id: string;
  field_key: string;
  label: string;
  field_type: string;
  sort_order: number;
  validation_chains: ValidationRule[];
  default_value: string | null;
  /*
    These three are how the field presents on the customer's application form,
    which is what `service_fields` now drives. Choices for a dropdown, ghost
    text in the input, and the line underneath it.
  */
  options: string[];
  placeholder: string | null;
  help_text: string | null;
}

export interface ServiceWorkflow {
  id: string;
  service_id: string;
  step_key: string;
  label: string;
  sort_order: number;
  allowed_transitions: string[];
}

export interface ServiceConfig {
  service: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    base_customer_fee: number;
    tat_hours: number;
    metadata: Record<string, unknown>;
  };
  fields: ServiceField[];
  workflows: ServiceWorkflow[];
}

interface DBServiceField {
  id: string;
  service_id: string;
  field_key: string;
  label: string;
  field_type: string;
  sort_order: number;
  validation_chains: unknown;
  default_value: string | null;
  options: unknown;
  placeholder: string | null;
  help_text: string | null;
}

interface DBServiceWorkflow {
  id: string;
  service_id: string;
  step_key: string;
  label: string;
  sort_order: number;
  allowed_transitions: unknown;
}

/**
 * Fetch complete dynamic configurations for a service (fields, validation rule chains, and status workflows)
 */
export async function getServiceConfig(serviceIdOrSlug: string): Promise<ServiceConfig | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  // 1. Fetch Service Registry details
  const serviceQuery = serviceIdOrSlug.includes("-") && serviceIdOrSlug.length > 24
    ? supabase.from("services").select("*").eq("id", serviceIdOrSlug).maybeSingle()
    : supabase.from("services").select("*").eq("slug", serviceIdOrSlug).maybeSingle();

  const { data: service, error: serviceError } = await serviceQuery;
  if (serviceError || !service) {
    console.error("[services-engine] Failed to load service definition:", serviceError);
    return null;
  }

  // 2. Fetch associated dynamic fields
  const { data: fieldsData, error: fieldsError } = await supabase
    .from("service_fields")
    .select("*")
    .eq("service_id", service.id)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    console.error("[services-engine] Failed to load service fields metadata:", fieldsError);
    return null;
  }

  // 3. Fetch status workflows
  const { data: workflowsData, error: workflowsError } = await supabase
    .from("service_workflows")
    .select("*")
    .eq("service_id", service.id)
    .order("sort_order", { ascending: true });

  if (workflowsError) {
    console.error("[services-engine] Failed to load service workflow rules:", workflowsError);
    return null;
  }

  return {
    service: {
      id: service.id,
      slug: service.slug,
      name: service.name,
      description: service.description,
      base_customer_fee: Number(service.base_customer_fee ?? 0),
      tat_hours: Number(service.tat_hours ?? 48),
      metadata: (service.metadata ?? {}) as Record<string, unknown>
    },
    fields: ((fieldsData ?? []) as unknown as DBServiceField[]).map((f) => ({
      id: f.id,
      service_id: f.service_id,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      sort_order: f.sort_order,
      validation_chains: (f.validation_chains ?? []) as ValidationRule[],
      default_value: f.default_value,
      // A jsonb column reads back as an array; a text one reads back as a
      // string. Anything that is not an array becomes an empty list rather
      // than something the editor will later call .map on.
      options: Array.isArray(f.options) ? (f.options as string[]) : [],
      placeholder: f.placeholder ?? null,
      help_text: f.help_text ?? null
    })),
    workflows: ((workflowsData ?? []) as unknown as DBServiceWorkflow[]).map((w) => ({
      id: w.id,
      service_id: w.service_id,
      step_key: w.step_key,
      label: w.label,
      sort_order: w.sort_order,
      allowed_transitions: (w.allowed_transitions ?? []) as string[]
    }))
  };
}

/**
 * Dynamic Validation Engine: Evaluates dynamic fields validation rules chains on payload submissions
 */
export function validateApplicationFields(
  fields: ServiceField[],
  formValues: Record<string, string | undefined>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const val = (formValues[field.field_key] ?? "").toString().trim();
    const chains = field.validation_chains;

    for (const ruleObj of chains) {
      const { rule, val: constraint, msg } = ruleObj;

      // 1. Required Check
      if (rule === "required") {
        if (!val) {
          errors[field.field_key] = msg || `${field.label} is required.`;
          break; // Stop checking further rules for this field once one fails
        }
      }

      // If value is empty and not required, skip validation chains
      if (!val) continue;

      // 2. Length Rules
      if (rule === "minLength" && typeof constraint === "number") {
        if (val.length < constraint) {
          errors[field.field_key] = msg || `${field.label} must contain at least ${constraint} characters.`;
          break;
        }
      }
      if (rule === "maxLength" && typeof constraint === "number") {
        if (val.length > constraint) {
          errors[field.field_key] = msg || `${field.label} must contain at most ${constraint} characters.`;
          break;
        }
      }

      // 3. Pattern Regex Checks
      if (rule === "pattern" && typeof constraint === "string") {
        try {
          const regex = new RegExp(constraint);
          if (!regex.test(val)) {
            errors[field.field_key] = msg || `${field.label} format is invalid.`;
            break;
          }
        } catch (e) {
          console.error(`[services-engine] Invalid regex pattern: ${constraint}`, e);
        }
      }

      // 4. Standard Format Valids
      if (rule === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          errors[field.field_key] = msg || "Please input a valid email address.";
          break;
        }
      }
      if (rule === "mobile") {
        if (val.replace(/\D/g, "").length !== 10) {
          errors[field.field_key] = msg || "Mobile number must be exactly 10 digits.";
          break;
        }
      }
      if (rule === "aadhaar") {
        if (val.replace(/\D/g, "").length !== 12) {
          errors[field.field_key] = msg || "Aadhaar number must be exactly 12 digits.";
          break;
        }
      }
      if (rule === "pan") {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
        if (!panRegex.test(val)) {
          errors[field.field_key] = msg || "PAN card format is invalid (e.g. ABCDE1234F).";
          break;
        }
      }
      if (rule === "gstin") {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
        if (!gstinRegex.test(val)) {
          errors[field.field_key] = msg || "GSTIN format is invalid.";
          break;
        }
      }
    }
  }

  return errors;
}

/**
 * State Transition Engine: Checks transitions mapping validity
 */
export function validateWorkflowTransition(
  workflows: ServiceWorkflow[],
  currentStep: string,
  nextStep: string
): boolean {
  const stepObj = workflows.find((w) => w.step_key === currentStep);
  if (!stepObj) return false;
  return stepObj.allowed_transitions.includes(nextStep);
}
