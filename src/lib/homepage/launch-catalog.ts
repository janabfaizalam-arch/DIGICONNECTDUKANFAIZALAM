/**
 * The company-launch homepage, as data.
 *
 * This file says what each business structure is, which launch services
 * exist as ideas ("modules"), when a module applies, and how the page talks
 * about them. It never says what anything costs and never says whether RNOS
 * sells it online. Both of those are facts the catalogue holds:
 *
 *   • `agent_services.customer_fee` is what /api/create-order charges, so a
 *     module found there is "checkout" and its fee is the figure we show.
 *   • `services` (or the static fallback the rest of the site already uses) is
 *     what the services directory lists, so a module found only there is
 *     "listed" and links to its page.
 *   • Anything else is "enquiry": the page explains it and lets the visitor
 *     ask, without claiming it can be bought.
 *
 * `resolveLaunchModules` is the only place that decision is made. It is pure
 * so it can be tested, and the homepage never re-derives a price on its own.
 *
 * The legal and tax descriptions are deliberately general. They describe the
 * position under the Companies Act 2013, the LLP Act 2008 and the Indian
 * Partnership Act 1932 at a level that does not go stale with each rate
 * change, and every surface that shows them carries the advice disclaimer.
 */

/* ─────────────────────────────────────────────────────────────────────────
   Business structures
   ───────────────────────────────────────────────────────────────────────── */

export type StructureId = "pvt" | "llp" | "opc" | "partnership" | "proprietorship";

export type Structure = {
  id: StructureId;
  name: string;
  short: string;
  /** One-line identity used on cards and chips. */
  tagline: string;
  summary: string;
  suits: string[];
  ownership: string;
  liability: string;
  legalEntity: string;
  governance: string;
  fundraising: string;
  compliance: string;
  /** 1 (light) – 3 (heavier). Drawn as a meter, always with its words. */
  complianceLevel: 1 | 2 | 3;
  tax: string;
  continuity: string;
  registration: string;
  limitations: string;
  /** The module that incorporates or registers this structure. */
  foundationModule: ModuleId;
};

export const STRUCTURES: Structure[] = [
  {
    id: "pvt",
    name: "Private Limited Company",
    short: "Pvt Ltd",
    tagline: "Built to raise capital and scale",
    summary:
      "A company registered with the Ministry of Corporate Affairs. It is a separate legal person from its owners, so shareholders' liability is generally limited to their shares, and ownership is held as transferable equity.",
    suits: ["Startups planning to raise investment", "Businesses expecting to hire and scale", "Founders who want a corporate identity with banks and clients"],
    ownership: "2 to 200 shareholders; at least 2 directors, one of whom must be resident in India.",
    liability: "Limited to unpaid share capital, in the ordinary case.",
    legalEntity: "Separate legal entity with perpetual succession.",
    governance: "Board of directors, board meetings, statutory registers and an annual general meeting.",
    fundraising: "Most suitable: equity can be issued to investors, and it is the structure most venture investors expect.",
    compliance: "Highest of the five: annual ROC filings, statutory audit every year regardless of turnover, director KYC and board processes.",
    complianceLevel: 3,
    tax: "Taxed as a domestic company. The rate depends on the tax regime the company opts for; profits distributed as dividends are taxed in shareholders' hands.",
    continuity: "Continues regardless of changes in shareholders or directors.",
    registration: "Incorporated through the MCA SPICe+ process with name approval, DSC and DIN for directors, MoA and AoA.",
    limitations: "More formal governance and recurring compliance cost; closing a company also takes a formal process.",
    foundationModule: "incorporation-pvt",
  },
  {
    id: "llp",
    name: "Limited Liability Partnership",
    short: "LLP",
    tagline: "Partnership flexibility, limited liability",
    summary:
      "A body corporate registered with the Ministry of Corporate Affairs that combines a partnership's flexible internal arrangement with limited liability for its partners.",
    suits: ["Professional and consulting practices", "Founders who want limited liability with lighter compliance", "Businesses not planning equity investment"],
    ownership: "At least 2 partners, with at least 2 designated partners, one of whom must be resident in India. No upper limit.",
    liability: "Limited to the agreed contribution, except in cases such as fraud.",
    legalEntity: "Separate legal entity with perpetual succession.",
    governance: "Governed by the LLP agreement between the partners.",
    fundraising: "Limited: there are no shares to issue, so equity investors generally prefer a company.",
    compliance: "Moderate: an annual return and a statement of accounts each year; audit only above prescribed turnover or contribution limits.",
    complianceLevel: 2,
    tax: "Taxed as a partnership firm under the Income-tax Act.",
    continuity: "Continues regardless of changes in partners.",
    registration: "Incorporated through the MCA FiLLiP process; the LLP agreement is filed after incorporation.",
    limitations: "Not designed for equity fundraising; converting later to a company is possible but is a separate process.",
    foundationModule: "incorporation-llp",
  },
  {
    id: "opc",
    name: "One Person Company",
    short: "OPC",
    tagline: "A company of one",
    summary:
      "A private company with a single member. It gives a solo founder the limited liability and corporate identity of a company, with a nominee named to take over if the member is unable to continue.",
    suits: ["Solo founders who want limited liability", "Freelancers and consultants formalising their work", "Founders who may convert to a private limited company later"],
    ownership: "Exactly 1 member who must be an individual Indian citizen, plus 1 nominee. At least 1 director.",
    liability: "Limited to unpaid share capital, in the ordinary case.",
    legalEntity: "Separate legal entity with perpetual succession through the nominee.",
    governance: "Company law applies with some relaxations, such as fewer board meetings and no annual general meeting.",
    fundraising: "Limited while it remains an OPC; bringing in more shareholders requires conversion to a private company.",
    compliance: "Similar to a private limited company, with some relaxations; statutory audit applies.",
    complianceLevel: 3,
    tax: "Taxed as a domestic company, in the same way as a private limited company.",
    continuity: "Continues; the nominee becomes the member if the member dies or becomes incapable of contracting.",
    registration: "Incorporated through MCA SPICe+ with the nominee's written consent.",
    limitations: "Only one member, and an individual can be a member of only one OPC at a time.",
    foundationModule: "incorporation-opc",
  },
  {
    id: "partnership",
    name: "Partnership Firm",
    short: "Partnership",
    tagline: "Two or more partners, one deed",
    summary:
      "Two or more people carrying on a business together under a partnership deed. Registration with the state Registrar of Firms is optional, but an unregistered firm cannot sue to enforce its contracts.",
    suits: ["Family businesses and small trading firms", "Partners who want a simple, low-cost setup", "Businesses where partners accept shared personal liability"],
    ownership: "At least 2 partners. The deed sets out capital, profit sharing and duties.",
    liability: "Unlimited, joint and several: partners' personal assets can be used to meet the firm's debts.",
    legalEntity: "Not a separate legal entity from its partners.",
    governance: "Governed by the partnership deed.",
    fundraising: "Low: no equity to issue; funding comes from partners' capital and loans.",
    compliance: "Low: mainly income-tax filings, plus GST and other registrations where they apply.",
    complianceLevel: 1,
    tax: "Taxed as a partnership firm under the Income-tax Act.",
    continuity: "Depends on the deed; a change in partners can dissolve or reconstitute the firm.",
    registration: "Partnership deed on stamp paper as per state law, and optional registration with the state Registrar of Firms.",
    limitations: "Unlimited personal liability; harder to transfer ownership or raise outside capital.",
    foundationModule: "incorporation-partnership",
  },
  {
    id: "proprietorship",
    name: "Sole Proprietorship",
    short: "Proprietorship",
    tagline: "The fastest way to start trading",
    summary:
      "One person running a business in their own name. There is no separate registration for a proprietorship itself; the business is identified through registrations such as GST, Udyam or a shops and establishments licence.",
    suits: ["Small traders, shops and local services", "Individuals testing an idea before formalising", "Businesses with simple, low-risk operations"],
    ownership: "A single individual.",
    liability: "Unlimited: the owner and the business are the same person in law.",
    legalEntity: "Not a separate legal entity.",
    governance: "No formal governance requirements.",
    fundraising: "Lowest: no equity to issue; funding is personal or by loan.",
    compliance: "Lowest: the owner's income-tax return, plus GST and licences where they apply.",
    complianceLevel: 1,
    tax: "Business income is taxed as the owner's personal income at individual slab rates.",
    continuity: "Ends with the owner; the business cannot be transferred as an entity.",
    registration: "No incorporation. Banks usually ask for registrations such as GST, Udyam or a shop licence as proof of the business.",
    limitations: "Unlimited personal liability, and growth or investment usually means changing structure later.",
    foundationModule: "incorporation-proprietorship",
  },
];

export function structureById(id: StructureId | null | undefined) {
  return STRUCTURES.find((structure) => structure.id === id) ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Business types
   ───────────────────────────────────────────────────────────────────────── */

export type BusinessTypeId =
  | "tech"
  | "consulting"
  | "trading"
  | "ecommerce"
  | "manufacturing"
  | "retail"
  | "food"
  | "agency"
  | "import-export"
  | "other";

export type BusinessType = {
  id: BusinessTypeId;
  label: string;
  hint: string;
  /** Modules worth a closer look for this kind of business, and why. */
  relevant: Partial<Record<ModuleId, string>>;
};

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "tech",
    label: "Technology startup",
    hint: "Software, apps, platforms",
    relevant: {
      "startup-india": "Innovation-led companies may qualify for DPIIT recognition.",
      trademark: "Protecting the product name early avoids a costly rebrand.",
    },
  },
  {
    id: "consulting",
    label: "Consulting",
    hint: "Advisory and professional work",
    relevant: { gst: "Needed once service turnover crosses the threshold, or for inter-state clients who require it." },
  },
  {
    id: "trading",
    label: "Trading",
    hint: "Buying and selling goods",
    relevant: {
      gst: "Goods suppliers above the threshold, and inter-state suppliers of goods, generally need GST.",
      msme: "Udyam registration can help with priority lending and scheme eligibility.",
    },
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    hint: "Selling on marketplaces or online",
    relevant: {
      gst: "Most marketplaces ask sellers for a GSTIN before listing.",
      trademark: "Brand registry programmes on marketplaces usually ask for a trademark application.",
    },
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    hint: "Producing goods",
    relevant: {
      msme: "Udyam registration is how manufacturing MSMEs access most support schemes.",
      gst: "Manufacturers supplying goods above the threshold generally need GST.",
    },
  },
  {
    id: "retail",
    label: "Retail",
    hint: "Shops and stores",
    relevant: { "shops-establishment": "Most states require shops to register under their Shops and Establishments Act." },
  },
  {
    id: "food",
    label: "Food business",
    hint: "Kitchens, cafés, packaged food",
    relevant: { fssai: "Every food business operator needs FSSAI registration or a licence, based on size and activity." },
  },
  {
    id: "agency",
    label: "Agency or services",
    hint: "Marketing, design, staffing",
    relevant: { trademark: "An agency's name is its brand; registering it protects client goodwill." },
  },
  {
    id: "import-export",
    label: "Import / export",
    hint: "Cross-border trade",
    relevant: {
      iec: "An Importer Exporter Code from DGFT is required to import or export goods.",
      gst: "Exporters and importers generally need GST registration.",
    },
  },
  { id: "other", label: "Something else", hint: "Tell us more later", relevant: {} },
];

export function businessTypeById(id: BusinessTypeId | null | undefined) {
  return BUSINESS_TYPES.find((type) => type.id === id) ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Launch modules
   ───────────────────────────────────────────────────────────────────────── */

export type ModuleId =
  | "incorporation-pvt"
  | "incorporation-llp"
  | "incorporation-opc"
  | "incorporation-partnership"
  | "incorporation-proprietorship"
  | "dsc"
  | "gst"
  | "gst-returns"
  | "msme"
  | "startup-india"
  | "trademark"
  | "fssai"
  | "iec"
  | "shops-establishment"
  | "iso"
  | "current-account"
  | "website"
  | "brand-identity"
  | "business-email"
  | "accounting"
  | "annual-compliance"
  | "itr"
  | "project-report";

export type ModuleGroup = "foundation" | "tax" | "licence" | "ip" | "digital" | "finance";

/** How a module relates to a founder's setup. Always shown in words, never by colour alone. */
export type ModuleNature = "foundation" | "conditional" | "optional" | "recurring";

export type LaunchModule = {
  id: ModuleId;
  label: string;
  group: ModuleGroup;
  nature: ModuleNature;
  /** Catalogue slugs this module may be stored under, most likely first. */
  slugs: string[];
  summary: string;
  /** When it is needed, for conditional modules; when it recurs, for recurring ones. */
  condition?: string;
  /** What decides the government's part of the cost. */
  governmentFee: string;
  /** Structures it applies to. Absent means all. */
  appliesTo?: StructureId[];
  notApplicable?: string;
  /** Modules this one only makes sense alongside. */
  requires?: ModuleId[];
};

export const MODULE_GROUPS: Record<ModuleGroup, { label: string; blurb: string }> = {
  foundation: { label: "Incorporation", blurb: "The legal entity itself" },
  tax: { label: "Tax & registrations", blurb: "GST, Udyam, DPIIT and returns" },
  licence: { label: "Licences & approvals", blurb: "Sector and state specific" },
  ip: { label: "Intellectual property", blurb: "Protect the name you build" },
  digital: { label: "Brand & digital", blurb: "How customers find you" },
  finance: { label: "Accounting & compliance", blurb: "Staying in good standing" },
};

const COMPANY_FORMS: StructureId[] = ["pvt", "opc"];
const MCA_FORMS: StructureId[] = ["pvt", "opc", "llp"];

export const LAUNCH_MODULES: LaunchModule[] = [
  {
    id: "incorporation-pvt",
    label: "Private Limited Company registration",
    group: "foundation",
    nature: "foundation",
    slugs: ["private-limited-registration", "private-limited-company-registration", "pvt-ltd-registration"],
    summary: "Name reservation, SPICe+ filing, MoA and AoA, and the Certificate of Incorporation with PAN and TAN.",
    governmentFee: "MCA fees and state stamp duty depend on authorised capital and the state of the registered office.",
    appliesTo: ["pvt"],
  },
  {
    id: "incorporation-llp",
    label: "LLP registration",
    group: "foundation",
    nature: "foundation",
    slugs: ["llp-registration", "limited-liability-partnership-registration"],
    summary: "Name reservation, FiLLiP incorporation filing and the LLP agreement filing that follows.",
    governmentFee: "MCA fees depend on partners' contribution; stamp duty on the LLP agreement varies by state.",
    appliesTo: ["llp"],
  },
  {
    id: "incorporation-opc",
    label: "One Person Company registration",
    group: "foundation",
    nature: "foundation",
    slugs: ["opc-registration", "one-person-company-registration"],
    summary: "SPICe+ incorporation for a single member, with nominee consent and constitutional documents.",
    governmentFee: "MCA fees and state stamp duty depend on authorised capital and the state of the registered office.",
    appliesTo: ["opc"],
  },
  {
    id: "incorporation-partnership",
    label: "Partnership firm registration",
    group: "foundation",
    nature: "foundation",
    slugs: ["partnership-firm-registration", "partnership-registration"],
    summary: "Partnership deed and registration with the state Registrar of Firms.",
    governmentFee: "Stamp duty on the deed and the Registrar of Firms fee are set by each state.",
    appliesTo: ["partnership"],
  },
  {
    id: "incorporation-proprietorship",
    label: "Proprietorship setup",
    group: "foundation",
    nature: "foundation",
    slugs: ["proprietorship-registration", "sole-proprietorship-registration", "proprietorship-setup"],
    summary: "Establishing the business identity through the registrations a proprietorship relies on.",
    governmentFee: "Depends on the registrations chosen; several, such as Udyam, carry no government fee.",
    appliesTo: ["proprietorship"],
  },
  {
    id: "dsc",
    label: "Digital Signature Certificate",
    group: "foundation",
    nature: "conditional",
    slugs: ["dsc", "digital-signature-certificate"],
    summary: "Class 3 DSC used to sign MCA and other government e-filings.",
    condition: "Directors and designated partners need a valid DSC to sign incorporation forms. Skip it if you already hold one.",
    governmentFee: "Issued by licensed certifying authorities; the price depends on validity and type.",
    appliesTo: MCA_FORMS,
    notApplicable: "Partnership firms and proprietorships do not file MCA incorporation forms.",
  },
  {
    id: "gst",
    label: "GST registration",
    group: "tax",
    nature: "conditional",
    slugs: ["gst-registration", "gst-registration-filing"],
    summary: "GSTIN application, document review and follow-up until the registration certificate is issued.",
    condition: "Required above the turnover threshold, for inter-state supply of goods and for most marketplace sellers. There are exceptions; we confirm your case.",
    governmentFee: "No government fee for GST registration.",
  },
  {
    id: "gst-returns",
    label: "GST return filing",
    group: "tax",
    nature: "recurring",
    slugs: ["gst-return-filing"],
    summary: "Periodic GSTR-1 and GSTR-3B filing with a review of input tax credit.",
    condition: "Recurring for every GST-registered business, monthly or quarterly depending on the scheme.",
    governmentFee: "No fee when filed on time; late fees and interest apply when delayed.",
    requires: ["gst"],
  },
  {
    id: "msme",
    label: "Udyam (MSME) registration",
    group: "tax",
    nature: "optional",
    slugs: ["msme-certificate", "msme-registration", "udyam-registration"],
    summary: "Udyam registration for micro, small and medium enterprises.",
    condition: "Optional, but often asked for by lenders and government schemes.",
    governmentFee: "No government fee on the Udyam portal.",
  },
  {
    id: "startup-india",
    label: "Startup India (DPIIT) recognition",
    group: "tax",
    nature: "optional",
    slugs: ["startup-india-assistance", "dpiit-registration"],
    summary: "Application for DPIIT recognition and guidance on the benefits it can unlock.",
    condition: "For entities under 10 years old, below the turnover limit, working on innovation or scalable models.",
    governmentFee: "No government fee for DPIIT recognition.",
    appliesTo: ["pvt", "llp", "partnership"],
    notApplicable: "DPIIT recognition is open to private limited companies, LLPs and registered partnership firms.",
  },
  {
    id: "trademark",
    label: "Trademark filing",
    group: "ip",
    nature: "optional",
    slugs: ["trademark-registration", "trademark-filing"],
    summary: "Search, class selection and filing of the trademark application.",
    condition: "Optional. Registration is decided by the Trade Marks Registry and can take months.",
    governmentFee: "Official fee per class depends on applicant type (individual, startup, MSME or other) and filing mode.",
  },
  {
    id: "fssai",
    label: "FSSAI registration / licence",
    group: "licence",
    nature: "conditional",
    slugs: ["food-licence", "food-license", "fssai-registration"],
    summary: "Basic registration, state licence or central licence, depending on the business.",
    condition: "Required for every food business operator. The category depends on turnover and activity.",
    governmentFee: "Depends on the category and the number of years chosen.",
  },
  {
    id: "iec",
    label: "Importer Exporter Code",
    group: "licence",
    nature: "conditional",
    slugs: ["import-export-code", "iec-registration"],
    summary: "IEC application on the DGFT portal.",
    condition: "Required to import or export goods, with limited exemptions.",
    governmentFee: "A fixed DGFT application fee.",
  },
  {
    id: "shops-establishment",
    label: "Shops & Establishments registration",
    group: "licence",
    nature: "conditional",
    slugs: ["shop-establishment-registration", "shops-and-establishments"],
    summary: "Registration under the state's Shops and Establishments Act.",
    condition: "Rules differ by state and often depend on premises and staff.",
    governmentFee: "Set by each state, often by the number of employees.",
  },
  {
    id: "iso",
    label: "ISO certification support",
    group: "licence",
    nature: "optional",
    slugs: ["iso-certification"],
    summary: "Documentation support for ISO 9001 and related standards.",
    condition: "Optional; certification is issued by an accredited certification body after audit.",
    governmentFee: "No government fee; the certification body charges for the audit.",
  },
  {
    id: "current-account",
    label: "Current account assistance",
    group: "finance",
    nature: "optional",
    slugs: ["current-account-opening"],
    summary: "Help preparing the documents banks ask for to open a business current account.",
    condition: "Optional. Account opening is decided by the bank.",
    governmentFee: "No government fee; the bank sets its own charges.",
  },
  {
    id: "website",
    label: "Website & domain",
    group: "digital",
    nature: "optional",
    slugs: ["website-development", "website-and-domain", "domain-and-website"],
    summary: "A business website on your own domain.",
    governmentFee: "No government fee; the domain registrar charges for the domain.",
  },
  {
    id: "brand-identity",
    label: "Logo & brand identity",
    group: "digital",
    nature: "optional",
    slugs: ["logo-design", "brand-identity", "logo-and-branding"],
    summary: "Logo and a basic brand kit for your documents and storefronts.",
    governmentFee: "No government fee.",
  },
  {
    id: "business-email",
    label: "Professional email",
    group: "digital",
    nature: "optional",
    slugs: ["business-email", "professional-email"],
    summary: "Email addresses on your company domain.",
    governmentFee: "No government fee; the email provider charges per mailbox.",
  },
  {
    id: "accounting",
    label: "Accounting & bookkeeping",
    group: "finance",
    nature: "recurring",
    slugs: ["accounting-bookkeeping", "bookkeeping", "accounting-services"],
    summary: "Books kept from day one, ready for returns and audit.",
    condition: "Ongoing: every business must maintain books of account.",
    governmentFee: "No government fee.",
  },
  {
    id: "annual-compliance",
    label: "Annual ROC compliance",
    group: "finance",
    nature: "recurring",
    slugs: ["private-limited-compliance", "annual-compliance", "roc-annual-filing"],
    summary: "Annual ROC filings, director KYC and the compliance calendar for a company.",
    condition: "Recurring every financial year for companies, whether or not they trade.",
    governmentFee: "MCA filing fees depend on share capital; late filing attracts additional fees.",
    appliesTo: COMPANY_FORMS,
    notApplicable: "Annual ROC compliance applies to companies. LLPs file their own annual forms.",
  },
  {
    id: "itr",
    label: "Income tax return filing",
    group: "finance",
    nature: "recurring",
    slugs: ["itr-filing", "itr-original"],
    summary: "Annual income tax return for the business or the proprietor.",
    condition: "Recurring every year. Companies and LLPs must file even without profit.",
    governmentFee: "No fee when filed on time; late filing attracts a fee.",
  },
  {
    id: "project-report",
    label: "Bank-ready project report",
    group: "finance",
    nature: "optional",
    slugs: ["detailed-project-report"],
    summary: "A detailed project report for business loans and government schemes.",
    condition: "Optional. Useful when applying for a loan to fund the business.",
    governmentFee: "No government fee.",
  },
];

export function moduleById(id: ModuleId) {
  return LAUNCH_MODULES.find((mod) => mod.id === id) ?? null;
}

export function foundationFor(structure: StructureId) {
  return structureById(structure)!.foundationModule;
}

/** Whether a module can be part of a setup with this structure, and why not. */
export function moduleApplicability(mod: LaunchModule, structure: StructureId | null) {
  if (!structure || !mod.appliesTo || mod.appliesTo.includes(structure)) return { ok: true as const };
  return { ok: false as const, reason: mod.notApplicable ?? "Not applicable to this structure." };
}

/* ─────────────────────────────────────────────────────────────────────────
   Resolving modules against the real catalogue
   ───────────────────────────────────────────────────────────────────────── */

/** A public catalogue entry, as the homepage's existing search already receives it. */
export type CatalogueEntry = {
  slug: string;
  title: string;
  shortDescription: string;
  priceLabel: string;
  amount: number;
};

/** The customer-facing columns of an `agent_services` row. Never payout or cost. */
export type CheckoutEntry = {
  slug: string;
  title: string;
  fee: number;
  governmentFeeType: "included" | "extra" | "not_applicable";
  governmentFeeAmount: number;
  processingTime: string | null;
};

export type Availability = "checkout" | "listed" | "enquiry";

export type ResolvedModule = {
  id: ModuleId;
  availability: Availability;
  /** The catalogue slug it resolved to, when it resolved. */
  slug: string | null;
  /** The figure checkout charges. Only set for "checkout". */
  fee: number | null;
  /** The listed price label, for "listed" modules that carry one. */
  priceLabel: string | null;
  /** Service page, when the directory has one. */
  href: string | null;
  /** RNOS's own quoted turnaround, when one is configured. */
  timeline: string | null;
  governmentFeeType: CheckoutEntry["governmentFeeType"] | null;
  governmentFeeAmount: number | null;
};

export function resolveLaunchModules(
  catalogue: CatalogueEntry[],
  checkout: CheckoutEntry[],
  timelines: Record<string, string> = {},
): Record<ModuleId, ResolvedModule> {
  const bySlug = new Map(catalogue.map((entry) => [entry.slug, entry]));
  const checkoutBySlug = new Map(checkout.filter((entry) => entry.fee > 0).map((entry) => [entry.slug, entry]));

  const resolved = {} as Record<ModuleId, ResolvedModule>;

  for (const mod of LAUNCH_MODULES) {
    const checkoutSlug = mod.slugs.find((slug) => checkoutBySlug.has(slug));
    const listedSlug = mod.slugs.find((slug) => bySlug.has(slug));
    const slug = checkoutSlug ?? listedSlug ?? null;
    const listed = slug ? bySlug.get(slug) : undefined;
    const charged = checkoutSlug ? checkoutBySlug.get(checkoutSlug) : undefined;

    resolved[mod.id] = {
      id: mod.id,
      availability: charged ? "checkout" : listed ? "listed" : "enquiry",
      slug,
      fee: charged ? charged.fee : null,
      priceLabel: !charged && listed && listed.amount > 0 ? listed.priceLabel : null,
      href: listed ? `/services/${listed.slug}` : null,
      timeline: charged?.processingTime || (slug ? timelines[slug] ?? null : null),
      governmentFeeType: charged ? charged.governmentFeeType : null,
      governmentFeeAmount: charged ? charged.governmentFeeAmount : null,
    };
  }

  return resolved;
}

export type BuilderLine = {
  mod: LaunchModule;
  resolved: ResolvedModule;
};

/**
 * The itemised view of a selection.
 *
 * `onlineTotal` is only the sum of fees checkout will charge, and is labelled
 * that way wherever it is shown — the server prices the order again from the
 * same table. Everything else is listed as quoted on request, never zero.
 */
export function summariseSelection(ids: ModuleId[], resolved: Record<ModuleId, ResolvedModule>) {
  const lines: BuilderLine[] = ids
    .map((id) => moduleById(id))
    .filter((mod): mod is LaunchModule => Boolean(mod))
    .map((mod) => ({ mod, resolved: resolved[mod.id] }));

  const online = lines.filter((line) => line.resolved.availability === "checkout");
  const quoted = lines.filter((line) => line.resolved.availability !== "checkout");
  const onlineTotal = online.reduce((sum, line) => sum + (line.resolved.fee ?? 0), 0);
  const governmentExtra = online.filter((line) => line.resolved.governmentFeeType === "extra");

  return { lines, online, quoted, onlineTotal, governmentExtra };
}

/* ─────────────────────────────────────────────────────────────────────────
   Starting selections ("packages")
   ───────────────────────────────────────────────────────────────────────── */

export type PresetId = "incorporation" | "business-ready" | "launch-complete" | "custom";

export type Preset = {
  id: PresetId;
  name: string;
  forWho: string;
  /** Modules on top of the structure's own foundation module. */
  modules: ModuleId[];
};

/**
 * Starting points for the builder, not bundles.
 *
 * Each is a selection of modules priced item by item from the catalogue. No
 * preset carries a price of its own or a bundle discount, because no bundle
 * with those contents exists in `service_packages`.
 */
export const PRESETS: Preset[] = [
  {
    id: "incorporation",
    name: "Basic Incorporation",
    forWho: "Founders who need the legal entity, and will add the rest as they go.",
    modules: ["dsc"],
  },
  {
    id: "business-ready",
    name: "Business Ready",
    forWho: "Founders who want to invoice, bank and apply for schemes from week one.",
    modules: ["dsc", "gst", "msme", "current-account"],
  },
  {
    id: "launch-complete",
    name: "Premium Business Launch",
    forWho: "Founders who want the registrations, brand and books set up together.",
    modules: ["dsc", "gst", "msme", "current-account", "trademark", "website", "brand-identity", "business-email", "accounting", "annual-compliance"],
  },
  {
    id: "custom",
    name: "Build Your Own",
    forWho: "Pick exactly what you need, one service at a time.",
    modules: [],
  },
];

/** A preset's modules for a structure, with anything not applicable removed. */
export function presetModules(preset: Preset, structure: StructureId): ModuleId[] {
  const ids: ModuleId[] = [foundationFor(structure), ...preset.modules];
  return ids.filter((id) => {
    const mod = moduleById(id);
    return mod ? moduleApplicability(mod, structure).ok : false;
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Documents
   ───────────────────────────────────────────────────────────────────────── */

export type DocumentItem = {
  id: string;
  label: string;
  detail: string;
  kind: "required" | "conditional" | "prepared";
  condition?: string;
};

const PERSON_DOCS: DocumentItem[] = [
  { id: "pan", label: "PAN of each director / partner", detail: "Mandatory for Indian nationals.", kind: "required" },
  { id: "id", label: "Identity proof", detail: "Aadhaar, passport, voter ID or driving licence.", kind: "required" },
  { id: "address", label: "Residential address proof", detail: "Recent bank statement or utility / mobile bill, usually not older than two months.", kind: "required" },
  { id: "photo", label: "Passport-size photograph", detail: "Recent, on a plain background.", kind: "required" },
];

const OFFICE_DOCS: DocumentItem[] = [
  { id: "office-bill", label: "Registered office utility bill", detail: "Electricity, water or gas bill, usually not older than two months.", kind: "required" },
  { id: "noc", label: "NOC from the property owner", detail: "Permission to use the premises as the registered office.", kind: "conditional", condition: "If the premises are not owned by the business." },
  { id: "rent", label: "Rent agreement or ownership document", detail: "Proof of the right to occupy the premises.", kind: "conditional", condition: "If the premises are rented." },
];

export const DOCUMENTS: Record<StructureId, DocumentItem[]> = {
  pvt: [
    ...PERSON_DOCS,
    ...OFFICE_DOCS,
    { id: "dsc", label: "Digital Signature Certificate", detail: "Class 3 DSC for each director to sign the filing.", kind: "conditional", condition: "If a director does not already hold a valid DSC." },
    { id: "foreign", label: "Notarised / apostilled passport", detail: "For directors or shareholders who are foreign nationals.", kind: "conditional", condition: "Foreign nationals only." },
    { id: "moa", label: "MoA, AoA and declarations", detail: "Drafted during the filing for your review and DSC signature.", kind: "prepared" },
  ],
  opc: [
    ...PERSON_DOCS,
    { id: "nominee", label: "Nominee's PAN, ID and written consent", detail: "The nominee consents in the prescribed form.", kind: "required" },
    ...OFFICE_DOCS,
    { id: "dsc", label: "Digital Signature Certificate", detail: "Class 3 DSC for the director.", kind: "conditional", condition: "If the director does not already hold a valid DSC." },
    { id: "moa", label: "MoA, AoA and declarations", detail: "Drafted during the filing for your review and DSC signature.", kind: "prepared" },
  ],
  llp: [
    ...PERSON_DOCS,
    ...OFFICE_DOCS,
    { id: "dsc", label: "Digital Signature Certificate", detail: "Class 3 DSC for each designated partner.", kind: "conditional", condition: "If a partner does not already hold a valid DSC." },
    { id: "agreement", label: "LLP agreement", detail: "Drafted after incorporation and filed with the MCA within the prescribed time.", kind: "prepared" },
  ],
  partnership: [
    { id: "pan", label: "PAN of each partner", detail: "Also needed for the firm's own PAN application.", kind: "required" },
    { id: "id", label: "Identity and address proof of partners", detail: "Aadhaar, passport, voter ID or driving licence.", kind: "required" },
    { id: "place", label: "Proof of the place of business", detail: "Utility bill with a rent agreement or ownership document.", kind: "required" },
    { id: "deed", label: "Partnership deed", detail: "Executed on stamp paper as per your state's stamp law.", kind: "prepared" },
    { id: "rof", label: "Registrar of Firms application", detail: "Form and affidavit prescribed by your state.", kind: "conditional", condition: "If you register the firm (recommended)." },
  ],
  proprietorship: [
    { id: "pan", label: "PAN of the proprietor", detail: "The business uses the proprietor's PAN.", kind: "required" },
    { id: "aadhaar", label: "Aadhaar of the proprietor", detail: "Used for Udyam and GST verification.", kind: "required" },
    { id: "place", label: "Proof of the place of business", detail: "Utility bill with a rent agreement or ownership document.", kind: "required" },
    { id: "registrations", label: "Two business registrations for the bank", detail: "Banks usually ask for proofs such as GST, Udyam or a shop licence.", kind: "conditional", condition: "To open a current account in the business name." },
  ],
};

/** The formats the existing application upload step accepts. */
export const ACCEPTED_UPLOAD_FORMATS = "Images (JPG, PNG) or PDF";

/* ─────────────────────────────────────────────────────────────────────────
   The journey
   ───────────────────────────────────────────────────────────────────────── */

export type JourneyPhase = "decide" | "incorporate" | "after" | "optional" | "recurring";

export const JOURNEY_PHASES: Record<JourneyPhase, string> = {
  decide: "Before you file",
  incorporate: "Incorporation",
  after: "After incorporation",
  optional: "Optional setup",
  recurring: "Recurring",
};

export const JOURNEY: { title: string; body: string; phase: JourneyPhase }[] = [
  { title: "Define the business", body: "What you sell, who owns it, and how you plan to grow. These answers decide the structure.", phase: "decide" },
  { title: "Choose the structure", body: "Company, LLP, OPC, partnership or proprietorship, weighed against liability, funding and compliance.", phase: "decide" },
  { title: "Prepare the documents", body: "Identity, address and office proofs for every director or partner, plus DSCs where MCA forms are signed.", phase: "incorporate" },
  { title: "File the application", body: "Name reservation and the incorporation filing, reviewed before submission and tracked after it.", phase: "incorporate" },
  { title: "Receive the certificate", body: "The Registrar issues the Certificate of Incorporation once the application is approved. Approval is the authority's decision.", phase: "incorporate" },
  { title: "Post-incorporation steps", body: "Share capital, statutory registers, the auditor's appointment and the commencement declaration, where they apply.", phase: "after" },
  { title: "Bank, books and systems", body: "A current account, accounting from day one, invoicing and payment collection.", phase: "after" },
  { title: "Tax registrations and licences", body: "GST, Udyam, FSSAI, IEC or a shop licence, only where your business needs them.", phase: "optional" },
  { title: "Brand and digital presence", body: "Trademark filing, a website on your domain and professional email.", phase: "optional" },
  { title: "Stay compliant", body: "Returns, annual filings and renewals every year, whether or not the business trades.", phase: "recurring" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Illustrative scenarios
   ───────────────────────────────────────────────────────────────────────── */

export const SCENARIOS: {
  id: string;
  title: string;
  situation: string;
  structure: StructureId;
  business: BusinessTypeId;
  modules: ModuleId[];
  why: string;
}[] = [
  {
    id: "saas",
    title: "Two founders building a SaaS product",
    situation: "They plan to raise a seed round within a year and hire engineers.",
    structure: "pvt",
    business: "tech",
    modules: ["dsc", "startup-india", "trademark", "accounting", "annual-compliance"],
    why: "A private limited company is the structure investors expect; DPIIT recognition and a trademark are worth exploring early.",
  },
  {
    id: "marketplace",
    title: "A home-décor brand selling on marketplaces",
    situation: "One founder, products sourced from artisans, listing on two marketplaces.",
    structure: "opc",
    business: "ecommerce",
    modules: ["dsc", "gst", "trademark", "current-account"],
    why: "Marketplaces typically ask for a GSTIN, and brand programmes for a trademark application.",
  },
  {
    id: "trading",
    title: "A family wholesale trading business",
    situation: "Two brothers formalising a business that already trades locally.",
    structure: "partnership",
    business: "trading",
    modules: ["gst", "msme", "current-account", "itr"],
    why: "A registered partnership keeps setup simple; GST and Udyam help with suppliers and lenders.",
  },
  {
    id: "consulting",
    title: "An independent management consultant",
    situation: "Working with three corporate clients, wants limited liability.",
    structure: "llp",
    business: "consulting",
    modules: ["dsc", "gst", "accounting", "itr"],
    why: "An LLP gives limited liability with lighter compliance than a company; GST depends on turnover and clients.",
  },
  {
    id: "cloud-kitchen",
    title: "A cloud kitchen planning a second outlet",
    situation: "One owner today, a partner likely to join next year.",
    structure: "pvt",
    business: "food",
    modules: ["dsc", "fssai", "gst", "trademark", "accounting"],
    why: "FSSAI is mandatory for any food business; a company makes it easier to bring in a partner later.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────────────────── */

export const FAQ_CATEGORIES = [
  "Incorporation",
  "Eligibility",
  "Documents",
  "Pricing & government charges",
  "Business structures",
  "GST & registrations",
  "Banking",
  "After incorporation",
  "Annual compliance",
  "Payments & refunds",
  "Tracking",
  "Support",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const LAUNCH_FAQS: { category: FaqCategory; question: string; answer: string }[] = [
  {
    category: "Incorporation",
    question: "How long does company incorporation take?",
    answer:
      "It depends on how quickly documents are ready and on the Registrar's processing time. Where we quote a turnaround for a service, it is shown next to that service on this page. No one can guarantee an approval date, because the Registrar of Companies decides each application.",
  },
  {
    category: "Incorporation",
    question: "Does RNOS approve or issue registrations?",
    answer:
      "No. RNOS India Private Limited is a private assistance service. Certificates, registrations and licences are issued by the relevant authority, such as the Ministry of Corporate Affairs, GSTN or FSSAI, and approval is their decision.",
  },
  {
    category: "Eligibility",
    question: "Who can be a director of a private limited company?",
    answer:
      "An individual of at least 18 years who is not disqualified under the Companies Act. A private limited company needs at least two directors, and at least one director must be resident in India.",
  },
  {
    category: "Eligibility",
    question: "Can a non-resident Indian start an OPC?",
    answer:
      "The member of a One Person Company must be an individual Indian citizen. Current rules allow Indian citizens who are not resident to form an OPC; confirm your specific situation before applying.",
  },
  {
    category: "Documents",
    question: "Which documents do I need to register a company?",
    answer:
      "Typically PAN, identity proof, address proof and a photograph for each director and shareholder, plus a utility bill for the registered office and, if it is rented, an NOC and rent agreement. Use the document readiness checklist on this page for your structure; the final list is confirmed during your application.",
  },
  {
    category: "Documents",
    question: "Can I use a residential address as the registered office?",
    answer:
      "Generally yes, provided you have the owner's permission (an NOC) and a recent utility bill for the address. The office must be able to receive official communication.",
  },
  {
    category: "Pricing & government charges",
    question: "Why can't you show one fixed price for incorporation?",
    answer:
      "Government fees and stamp duty depend on the authorised capital and the state of the registered office. The service fee shown for a service is what checkout charges; government charges are explained separately and confirmed for your case.",
  },
  {
    category: "Pricing & government charges",
    question: "Is the total in the builder the final amount?",
    answer:
      "The builder adds up the service fees our checkout charges for the services you can buy online. Checkout prices the order again on our server before payment, and services marked 'quoted on request' are priced by our team after you ask.",
  },
  {
    category: "Business structures",
    question: "Should I choose a private limited company or an LLP?",
    answer:
      "A company suits founders who want to raise equity investment or scale with a corporate structure, and it carries more compliance. An LLP offers limited liability with lighter compliance but is not designed for equity investors. The right choice depends on your plans; professional advice is recommended.",
  },
  {
    category: "Business structures",
    question: "Can I change my business structure later?",
    answer:
      "Conversions are possible in many cases, for example a proprietorship or partnership into a company, or an OPC into a private limited company, but each is its own legal process with conditions. Choosing well at the start usually costs less.",
  },
  {
    category: "GST & registrations",
    question: "Do I need GST registration as soon as I incorporate?",
    answer:
      "Not always. GST becomes mandatory above the turnover threshold, for inter-state supply of goods, for most marketplace sellers and in some other cases. Many businesses also register voluntarily. Ask us to confirm your case.",
  },
  {
    category: "GST & registrations",
    question: "Is Udyam (MSME) registration compulsory?",
    answer:
      "No. It is voluntary, free on the government portal, and often asked for by lenders and schemes for MSMEs.",
  },
  {
    category: "Banking",
    question: "When can I open a current account?",
    answer:
      "A company or LLP can apply once it has its Certificate of Incorporation and PAN. A proprietorship usually needs registrations such as GST or Udyam as proof of the business. Account opening is the bank's decision.",
  },
  {
    category: "After incorporation",
    question: "What happens after the certificate is issued?",
    answer:
      "Companies typically open a bank account, receive share capital, appoint the first auditor, maintain statutory registers and file the commencement of business declaration where it applies. These are separate from incorporation itself.",
  },
  {
    category: "Annual compliance",
    question: "Are annual filings included in incorporation?",
    answer:
      "No. Incorporation creates the entity. Annual ROC filings, income tax returns, GST returns and audit are recurring obligations that continue every year, and are offered separately.",
  },
  {
    category: "Annual compliance",
    question: "Do I have to file returns if the company has no business?",
    answer:
      "Yes. Companies and LLPs must file their annual returns and income tax returns even in a year without revenue. Missing them leads to late fees and penalties.",
  },
  {
    category: "Payments & refunds",
    question: "How do I pay, and is payment secure?",
    answer:
      "Online services are paid at checkout through Razorpay. The amount is calculated on our server, not in your browser, and payment is verified before your application is processed.",
  },
  {
    category: "Payments & refunds",
    question: "What is your refund policy?",
    answer:
      "Refunds and cancellations follow our published Refund & Cancellation policy. Government fees already paid to an authority generally cannot be recovered by us.",
  },
  {
    category: "Tracking",
    question: "How do I track my application?",
    answer:
      "Signed-in customers see every application and its status in their dashboard, and anyone can use the Track Application page with their application details.",
  },
  {
    category: "Support",
    question: "How do I talk to someone before I decide?",
    answer:
      "Send an enquiry from this page, call or WhatsApp us during support hours. Tell us your business and plans, and we will explain the options; for legal or tax advice specific to you, we recommend consulting a professional.",
  },
];
