// src/types/service.ts

export interface ServiceField {
  id: string;
  service_id: string;
  field_key: string;
  label: string;
  field_type: string;
  sort_order: number;
  validation_chains: ValidationRule[];
  default_value: string | null;
}

export interface ValidationRule {
  rule: "required" | "minLength" | "maxLength" | "pattern" | "email" | "mobile" | "aadhaar" | "pan" | "gstin";
  val?: unknown;
  msg?: string;
}

export interface ServiceWorkflow {
  id: string;
  service_id: string;
  step_key: string;
  label: string;
  sort_order: number;
  allowed_transitions: string[];
}

// New interfaces for extended capabilities
export interface DocumentRequirement {
  id?: string;
  name: string;
  required: boolean;
  reusable: boolean;
}

export interface PricingEngine {
  customer_price: number;
  partner_cost: number;
  tax_percent?: number;
  dynamic_pricing?: boolean;
}

export interface CommissionEngine {
  type: "fixed" | "percentage" | "slab" | "partner_specific";
  value?: number; // for fixed or percentage
  slabs?: { from: number; to: number; rate: number }[]; // for slab
  partner_id?: string; // for partner specific
}

export interface AutomationRule {
  event: string; // e.g., "application_created"
  actions: string[]; // e.g., ["send_notification", "credit_commission"]
}

export interface ServiceConfig {
  service: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    base_customer_fee: number;
    tat_hours: number;
    // New fields
    status: "draft" | "published";
    category: string;
    processing_time_hours: number;
    icon_type: "predefined" | "custom";
    icon_value: string; // enum key or URL
    metadata: Record<string, unknown>;
  };
  fields: ServiceField[];
  workflows: ServiceWorkflow[];
  documents?: DocumentRequirement[];
  pricing?: PricingEngine;
  commission?: CommissionEngine;
  automation?: AutomationRule[];
  published?: boolean;
}
