// ============================================================================
// Digi Partner type — single source of truth
// DigiConnect Dukan — Partner Type Redesign
// ============================================================================

export type DigiPartnerType =
  | "business_partner"
  | "company_partner"
  | "field_executive"
  | "office_staff";

export const DIGI_PARTNER_TYPE_VALUES = [
  "business_partner",
  "company_partner",
  "field_executive",
  "office_staff",
] as const satisfies readonly DigiPartnerType[];

export const DIGI_PARTNER_TYPES = {
  business_partner: {
    label: "Business Partner",
    icon: "🏢",
    description: "Owns or operates a shop, digital service centre, CSC, or local business.",
  },
  company_partner: {
    label: "Company Partner",
    icon: "🤝",
    description: "Official business or strategic partner of RNOS India Pvt. Ltd.",
  },
  field_executive: {
    label: "Field Executive",
    icon: "🚶",
    description: "Handles field operations, customer acquisition, and document collection.",
  },
  office_staff: {
    label: "Office Staff",
    icon: "👨‍💼",
    description: "Internal office employee handling operations, processing, or support.",
  },
} as const satisfies Record<
  DigiPartnerType,
  { label: string; icon: string; description: string }
>;

/**
 * What a stranger may apply as.
 *
 * All four types exist, but only two describe somebody who arrives from the
 * website on their own: a shop, and a person who works the field. A Company
 * Partner is a commercial arrangement signed off by us, and Office Staff is an
 * internal employee — both are created by an admin or by a Company Partner
 * from /ap/team, and neither should be self-selectable by whoever opens the
 * apply page. Offering all four made the form read like an internal HR
 * screen and let anyone claim to be a strategic partner of the company.
 */
export const PUBLIC_APPLICATION_PARTNER_TYPES = [
  "business_partner",
  "field_executive",
] as const satisfies readonly DigiPartnerType[];

export type PublicApplicationPartnerType = (typeof PUBLIC_APPLICATION_PARTNER_TYPES)[number];

export function isPublicApplicationPartnerType(
  value: string | null | undefined,
): value is PublicApplicationPartnerType {
  return (PUBLIC_APPLICATION_PARTNER_TYPES as readonly string[]).includes(String(value ?? ""));
}

/** Temporary API/validation boundary map for legacy incoming values. */
export const LEGACY_PARTNER_TYPE_MAP = {
  ceo: "company_partner",
  shop_owner: "business_partner",
  field_executive: "field_executive",
  // Common historical / UI aliases → canonical Digi Partner types
  agent: "field_executive",
  sub_agent: "field_executive",
  field_staff: "field_executive",
  team_member: "office_staff",
  staff: "office_staff",
  employee: "office_staff",
  agency_staff: "office_staff",
  franchise: "business_partner",
  consultant: "business_partner",
  reseller: "business_partner",
} as const;

export type LegacyPartnerType = keyof typeof LEGACY_PARTNER_TYPE_MAP;

export const PARTNER_TYPE_CAPABILITIES = {
  business_partner: {
    canManageTeam: false,
  },
  company_partner: {
    canManageTeam: true,
  },
  field_executive: {
    canManageTeam: false,
  },
  office_staff: {
    canManageTeam: false,
  },
} as const satisfies Record<DigiPartnerType, { canManageTeam: boolean }>;

export const AP_PARTNER_TYPE_LABELS: Record<DigiPartnerType, string> = {
  business_partner: DIGI_PARTNER_TYPES.business_partner.label,
  company_partner: DIGI_PARTNER_TYPES.company_partner.label,
  field_executive: DIGI_PARTNER_TYPES.field_executive.label,
  office_staff: DIGI_PARTNER_TYPES.office_staff.label,
};

export function isDigiPartnerType(value: string | null | undefined): value is DigiPartnerType {
  return (
    value === "business_partner" ||
    value === "company_partner" ||
    value === "field_executive" ||
    value === "office_staff"
  );
}

/**
 * Normalize legacy or canonical partner_type strings to DigiPartnerType.
 * Returns null when the value cannot be mapped.
 */
export function normalizePartnerType(input: string | null | undefined): DigiPartnerType | null {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();

  if (isDigiPartnerType(raw)) return raw;

  if (raw in LEGACY_PARTNER_TYPE_MAP) {
    return LEGACY_PARTNER_TYPE_MAP[raw as LegacyPartnerType];
  }

  return null;
}

/** Require a valid (possibly legacy) partner type or throw a clear error message. */
export function requirePartnerType(input: string | null | undefined): DigiPartnerType {
  const normalized = normalizePartnerType(input);
  if (!normalized) {
    throw new Error(
      `Invalid partner type. Must be one of: ${DIGI_PARTNER_TYPE_VALUES.join(", ")}.`,
    );
  }
  return normalized;
}

export function isCompanyPartnerType(partnerType: string | null | undefined): boolean {
  return normalizePartnerType(partnerType) === "company_partner";
}

export function canManagePartnerTeam(partnerType: string | null | undefined): boolean {
  const normalized = normalizePartnerType(partnerType);
  if (!normalized) return false;
  return PARTNER_TYPE_CAPABILITIES[normalized].canManageTeam;
}

/** Types a Company Partner may create under their team (not another company_partner). */
export function teamCreatablePartnerTypes(): DigiPartnerType[] {
  return ["business_partner", "field_executive", "office_staff"];
}

export function isTeamCreatablePartnerType(partnerType: string | null | undefined): boolean {
  const normalized = normalizePartnerType(partnerType);
  return normalized !== null && teamCreatablePartnerTypes().includes(normalized);
}

/**
 * Future per-type dashboard routes currently alias to the shared AP dashboard.
 */
export function resolvePartnerDashboardPath(
  partnerType: string | null | undefined,
): string {
  const normalized = normalizePartnerType(partnerType);
  switch (normalized) {
    case "business_partner":
      return "/ap/dashboard";
    case "company_partner":
      return "/ap/dashboard";
    case "field_executive":
      return "/ap/dashboard";
    case "office_staff":
      return "/ap/dashboard";
    default:
      return "/ap/dashboard";
  }
}

export function partnerTypeDisplayLabel(partnerType: string | null | undefined): string {
  const normalized = normalizePartnerType(partnerType);
  if (!normalized) {
    return partnerType ? String(partnerType).replace(/_/g, " ") : "—";
  }
  const meta = DIGI_PARTNER_TYPES[normalized];
  return `${meta.icon} ${meta.label}`;
}

export function partnerTypeSelectOptions(
  types: readonly DigiPartnerType[] = DIGI_PARTNER_TYPE_VALUES,
): Array<{ value: DigiPartnerType; label: string; description: string }> {
  return types.map((value) => {
    const meta = DIGI_PARTNER_TYPES[value];
    return {
      value,
      label: `${meta.icon} ${meta.label}`,
      description: meta.description,
    };
  });
}
