/**
 * CM YUVA landing page content.
 *
 * Everything the page says lives here rather than inside the components, so
 * the copy can be reviewed as copy. Two rules held throughout:
 *
 *   1. **Nothing about the scheme is invented.** The loan ceilings, the age
 *      band, the education floor, the margin-money figure and the sector rules
 *      are the business's own researched copy, carried over unchanged from the
 *      earlier page. No new figure has been added to them here.
 *
 *   2. **Nothing about DigiConnect's track record is invented.** The earlier
 *      page animated four counters — 12,450 applications assisted, 8,240
 *      reports, 10,120 MSME filings and a 4.9 rating — that nothing produced
 *      and nobody could check. They are gone, and the statistics band below
 *      carries facts about the scheme and the service instead.
 *
 * Approval is the bank's and the department's decision. `COMPLIANCE_NOTE` says
 * so, and it renders on the page rather than sitting in a footer.
 */

export const CM_YUVA_SLUG = "cm-yuva-entrepreneur-loan-assistance";
export const CM_YUVA_PATH = `/services/${CM_YUVA_SLUG}`;
export const CM_YUVA_APPLY_PATH = `/apply/${CM_YUVA_SLUG}`;

/**
 * Fallback fee, used only when the service row carries no price.
 *
 * The page reads the amount from the row it is rendering, so what a customer
 * sees is what that service actually charges. Nothing in the copy repeats a
 * figure — the FAQ points at the pricing section rather than quoting a number
 * that would go stale the moment an administrator changes it.
 */
export const CM_YUVA_PRICE = 13499;

export const CM_YUVA_SUPPORT_PHONE = "+917007595931";
export const CM_YUVA_WHATSAPP_NUMBER = "917007595931";

export const CM_YUVA_IMAGES = {
  logo: "/images/services/yuva/cm-yuva-logo.png",
  hero: "/images/services/yuva/hero-banner.jpg",
  interestFree: "/images/services/yuva/interest-free-poster.png",
  subsidy: "/images/services/yuva/subsidy-poster.png",
} as const;

export const COMPLIANCE_NOTE =
  "DigiConnect Dukan provides documentation, project report, registration and application assistance. Final approval, subsidy sanction and loan disbursal are decisions of the government department and the lending bank, not of DigiConnect.";

/* ─────────────────────────────────────────────────────────────────────────
   The scheme, in four numbers
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The headline terms, as the state publishes them.
 *
 * `note` is what each figure actually means, because "0% interest" without the
 * word *subvention* beside it is the sort of half-truth an applicant discovers
 * at the branch counter.
 */
export const SCHEME_TERMS = [
  {
    label: "Manufacturing units",
    value: "₹10 lakh",
    note: "Project loan ceiling for industrial and manufacturing enterprises.",
  },
  {
    label: "Service & small units",
    value: "₹5 lakh",
    note: "Ceiling for service sector and small-scale enterprises.",
  },
  {
    label: "Effective interest",
    value: "0%",
    note: "The state reimburses the interest as a subvention. You pay the EMI; the interest portion is credited back on prompt repayment.",
  },
  {
    label: "Margin money subsidy",
    value: "₹50,000",
    note: "10% of project cost as an upfront grant to the loan account, capped at ₹50,000.",
  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Eligibility
   ───────────────────────────────────────────────────────────────────────── */

export const ELIGIBILITY = [
  { title: "Age 21 to 40", detail: "Measured at the time of filing the application." },
  { title: "Uttar Pradesh domicile", detail: "A permanent resident, with a domicile certificate to prove it." },
  { title: "Class 8 passed or above", detail: "Class 10, 12 or a degree is preferred but not required." },
  { title: "No lender default", detail: "A clean repayment record. An active default or write-off fails the bank's credit check." },
  {
    title: "No overlapping scheme benefit",
    detail: "You cannot already be drawing subvention under PMEGP or another state-funded employment scheme.",
  },
  {
    title: "Manufacturing or service activity",
    detail: "Pure retail trading is not eligible. The sectors below are.",
  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Eligible sectors
   ───────────────────────────────────────────────────────────────────────── */

export type SectorIconKey =
  | "factory"
  | "layers"
  | "wheat"
  | "wrench"
  | "activity"
  | "hardHat"
  | "monitor"
  | "stethoscope"
  | "graduation"
  | "sprout"
  | "boxes"
  | "briefcase";

export const ELIGIBLE_SECTORS: { title: string; detail: string; icon: SectorIconKey }[] = [
  {
    title: "Manufacturing",
    detail: "Processing mills, packaging plants, textile production and small-scale factories.",
    icon: "factory",
  },
  {
    title: "Service sector",
    detail: "Software development, diagnostic centres, consultancies and tailoring units.",
    icon: "layers",
  },
  {
    title: "Food processing",
    detail: "Oil extraction, flour milling, cold storage, bakeries and spice processing.",
    icon: "wheat",
  },
  {
    title: "Engineering workshop",
    detail: "Auto garages, lathe machining, sheet-metal welding and industrial fabrication.",
    icon: "wrench",
  },
  {
    title: "Repair & maintenance",
    detail: "Appliance servicing, device repair desks and automobile repair centres.",
    icon: "activity",
  },
  {
    title: "Technical services",
    detail: "HVAC installation, architectural mapping, civil design and plumbing setups.",
    icon: "hardHat",
  },
  {
    title: "Digital & IT services",
    detail: "Software centres, cyber security setups, SEO consulting and animation studios.",
    icon: "monitor",
  },
  {
    title: "Healthcare services",
    detail: "Physiotherapy clinics, nursing consulting, pathology labs and pharmacies.",
    icon: "stethoscope",
  },
  {
    title: "Education & skills",
    detail: "Coaching classes, vocational training, gyms and skill certification schools.",
    icon: "graduation",
  },
  {
    title: "Agro processing",
    detail: "Bio-fertiliser plants, solar dryers, animal feed units and commercial nurseries.",
    icon: "sprout",
  },
  {
    title: "Small industrial units",
    detail: "Soap packaging, fly-ash brick kilns, paper bags and box packaging.",
    icon: "boxes",
  },
  {
    title: "Professional services",
    detail: "Accounting practices, legal advisory desks and credit consultancy offices.",
    icon: "briefcase",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Documents
   ───────────────────────────────────────────────────────────────────────── */

/** The four DigiConnect needs to start. */
export const DOCUMENTS_TO_START = [
  { title: "PAN card", detail: "Individual tax identifier." },
  { title: "Aadhaar card", detail: "Linked to a working mobile number for OTP." },
  { title: "Bank passbook", detail: "The account the subvention will be credited to." },
  { title: "Class 8 marksheet or above", detail: "Proof of the education floor." },
] as const;

/** What the department and the bank ask for before the file moves. */
export const DOCUMENTS_FOR_FILING = [
  "UP domicile certificate",
  "Caste certificate, if claiming a reserved-category benefit",
  "Address proof for the proposed business premises",
  "Machinery or equipment quotation from an authorised dealer",
  "Detailed Project Report with the project cost summary",
  "Non-defaulting affidavit, notarised",
  "EDP training certificate, once completed",
  "Passport-size photograph",
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Process
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The ten stages a file passes through.
 *
 * `owner` says who is acting at each stage, which is the honest version of a
 * progress tracker: DigiConnect controls the first five and nothing after the
 * upload. The earlier page rendered these with Completed / In Progress badges
 * hardcoded on a public page, so every visitor saw the same fake progress on
 * an application they had not made.
 */
export const PROCESS_STAGES = [
  {
    step: 1,
    title: "Eligibility check",
    owner: "DigiConnect",
    detail: "Your profile is tested against the scheme rules before anything is charged or filed.",
  },
  {
    step: 2,
    title: "Document collection",
    owner: "DigiConnect",
    detail: "PAN, Aadhaar, bank passbook and marksheet are collected and checked for name and spelling matches.",
  },
  {
    step: 3,
    title: "Project report preparation",
    owner: "DigiConnect",
    detail: "Credit analysts prepare the DPR: cost of project, machinery schedule, projections and break-even.",
  },
  {
    step: 4,
    title: "MSME / Udyam registration",
    owner: "DigiConnect",
    detail: "Udyam filing is completed so the file qualifies for priority-sector lending treatment.",
  },
  {
    step: 5,
    title: "Application compiled",
    owner: "DigiConnect",
    detail: "The full dossier is assembled and checked against the department's own list before upload.",
  },
  {
    step: 6,
    title: "Portal upload",
    owner: "DigiConnect",
    detail: "The application is submitted on the UP youth self-employment portal.",
  },
  {
    step: 7,
    title: "DUDA / department review",
    owner: "Department",
    detail: "Municipal and departmental bodies run their credential checks.",
  },
  {
    step: 8,
    title: "DIC scrutiny",
    owner: "Department",
    detail: "The District Industry Centre reviews the file. We follow up and answer queries on your behalf.",
  },
  {
    step: 9,
    title: "Bank credit appraisal",
    owner: "Bank",
    detail: "The DIC forwards the file to a branch, which runs its own CIBIL and viability assessment.",
  },
  {
    step: 10,
    title: "Sanction & disbursal",
    owner: "Bank",
    detail: "The branch decides. Approval and the amount are entirely the bank's call.",
  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   What DigiConnect does
   ───────────────────────────────────────────────────────────────────────── */

export const WHAT_WE_DO = [
  {
    title: "Detailed Project Report",
    detail:
      "A costed, bank-format DPR with machinery schedule, projections and break-even — not a filled-in template.",
  },
  {
    title: "MSME / Udyam registration",
    detail: "Filed for you, with the activity codes chosen to match the project the bank will read.",
  },
  {
    title: "Document review before filing",
    detail:
      "Name and spelling matched across Aadhaar, PAN and marksheets, because a mismatch is the most common rejection.",
  },
  {
    title: "Portal submission",
    detail: "The dossier uploaded to the state portal, assembled the way the department expects it.",
  },
  {
    title: "DIC follow-up",
    detail: "We chase the file through DUDA, NIC and the District Industry Centre so it does not sit in a queue.",
  },
  {
    title: "Status on WhatsApp",
    detail: "Every stage change is sent to your verified number, and tracked in your customer portal.",
  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Common rejections
   ───────────────────────────────────────────────────────────────────────── */

/** The three failure modes worth warning about up front. */
export const COMMON_REJECTIONS = [
  {
    title: "Name mismatch across documents",
    detail:
      "A spelling difference between Aadhaar, PAN and the marksheet is the single most common reason a file is returned.",
  },
  {
    title: "A retail shop filed as a service unit",
    detail: "Pure retail trading is outside the scheme. The activity has to genuinely be manufacturing or service.",
  },
  {
    title: "A generic project report",
    detail:
      "Template DPRs and machinery quotes that do not match the costing are rejected at credit appraisal.",
  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Why applicants use an assisted filing
   ───────────────────────────────────────────────────────────────────────── */

export const COMPARISON_ROWS = [
  {
    feature: "Project report",
    digiconnect: "Costed DPR prepared for your project",
    alone: "A downloaded template, usually rejected",
  },
  {
    feature: "Document checking",
    digiconnect: "Name and spelling matched before filing",
    alone: "Found at the counter, after a rejection",
  },
  { feature: "MSME / Udyam", digiconnect: "Filed as part of the package", alone: "A separate errand" },
  {
    feature: "Department follow-up",
    digiconnect: "DUDA, NIC and DIC chased on your behalf",
    alone: "Repeat visits to the district office",
  },
  { feature: "Status", digiconnect: "WhatsApp updates and portal tracking", alone: "Phone calls and guesswork" },
  { feature: "Fee", digiconnect: "One published amount, paid once", alone: "Agent fees quoted per step" },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Trust
   ───────────────────────────────────────────────────────────────────────── */

export const TRUST_POINTS = [
  {
    title: "Secure document handling",
    detail: "Uploads travel over an encrypted connection and are stored in access-controlled storage.",
  },
  { title: "Expert project reports", detail: "Prepared by credit analysts, in the format branches read." },
  { title: "MSME registration included", detail: "Filed with the package, not billed separately." },
  { title: "Department liaison", detail: "DUDA, NIC and DIC followed up until the file moves." },
  { title: "WhatsApp support", detail: "Questions answered and stage changes pushed to your number." },
  { title: "One published fee", detail: "No per-step charges, and nothing taken before you see the summary." },
] as const;

export const TRUST_BADGES = [
  "Secure Razorpay payments",
  "Encrypted document uploads",
  "Customer portal tracking",
  "PAN India partner network",
  "RNOS-backed operations",
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Statistics
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Four numbers about the scheme and the service.
 *
 * Every one is either published by the state or set by DigiConnect. None of
 * them is a claim about how many people have used this page, which is what the
 * four animated counters on the earlier version were.
 */
export const SCHEME_STATS = [
  { label: "Manufacturing ceiling", value: 10, prefix: "₹", suffix: " lakh" },
  { label: "Service sector ceiling", value: 5, prefix: "₹", suffix: " lakh" },
  { label: "Margin money subsidy", value: 50000, prefix: "₹", suffix: "" },
  { label: "Eligible sectors covered", value: 12, prefix: "", suffix: "" },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────────────────── */

export const FAQS: { question: string; answer: string }[] = [
  {
    question: "What is the CM YUVA entrepreneur loan scheme?",
    answer:
      "Mukhyamantri Yuva Udyami Vikas Abhiyan (CM YUVA) is an Uttar Pradesh government scheme for young entrepreneurs setting up micro-enterprises. It offers collateral-free credit with an interest subvention, along with a margin money subsidy. DigiConnect provides the documentation side: project report, MSME registration and the application filing.",
  },
  {
    question: "What are the eligibility criteria?",
    answer:
      "You must be a permanent resident of Uttar Pradesh, aged between 21 and 40 at the time of filing, and have passed at least Class 8. You must not be a defaulter with any lender, and you must not already be drawing benefits under PMEGP or another state-funded employment scheme.",
  },
  {
    question: "How much can I borrow?",
    answer:
      "Manufacturing and industrial units can apply for project loans up to ₹10 lakh. Service sector and small-scale units can apply for up to ₹5 lakh. The ceiling covers both capital expenditure — machinery and tools — and working capital.",
  },
  {
    question: "Is the loan really interest-free?",
    answer:
      "The scheme works by interest subvention rather than a zero-interest loan. You repay the principal EMI to the bank as normal, and the state credits the interest portion back to your account when repayment is prompt — which makes the effective interest cost nil. Missing repayments puts that subvention at risk.",
  },
  {
    question: "What is the ₹50,000 subsidy?",
    answer:
      "A margin money subsidy of 10% of the total project cost, capped at ₹50,000, credited to your loan account as an upfront government grant. It reduces the principal you owe the bank.",
  },
  {
    question: "Why does the project report matter so much?",
    answer:
      "The Detailed Project Report is what the bank's credit manager and the District Industry Centre actually read. It carries the fixed capital costs, machinery quotations, projected accounts, cash flow and break-even. A generic downloaded template is the fastest route to a rejection, which is why the DPR is prepared for your specific project.",
  },
  {
    question: "What documents do I need to start?",
    answer:
      "Four to begin: PAN card, Aadhaar linked to an active mobile number, bank passbook, and a Class 8 marksheet or higher. The domicile certificate, machinery quotation, caste certificate if applicable, premises address proof, notarised non-default affidavit and EDP certificate are needed before the file is submitted.",
  },
  {
    question: "What are the most common reasons for rejection?",
    answer:
      "Three, in order: a spelling mismatch between the name on Aadhaar, PAN and the marksheet; a retail trading shop filed as a service enterprise, when pure retail is not eligible; and a project report or machinery quotation that does not stand up to credit appraisal.",
  },
  {
    question: "Can women apply, and is there any priority?",
    answer:
      "Yes. The state actively encourages women entrepreneurs under this scheme, and District Industry Centres operate priority routing for women-led applications. The filing is the same; we make sure the application is structured so the priority is claimed.",
  },
  {
    question: "How long does the whole process take?",
    answer:
      "The part DigiConnect controls — eligibility check, documents, project report, MSME registration and portal upload — typically runs over a couple of weeks depending on how quickly documents arrive. What follows is departmental and bank timing, which varies by district and is outside anyone's control but theirs.",
  },
  {
    question: "Is EDP training compulsory?",
    answer:
      "You can submit the application without it, but the bank and the District Industry Centre need the Entrepreneurship Development Programme certificate before the credit agreement is executed. We help you register for the official online module so it is ready in time.",
  },
  {
    question: "Do you guarantee that the loan will be approved?",
    answer:
      "No, and you should be wary of anyone who does. Sanctioning is entirely the bank's decision, based on your credit record and the viability of the project. What is guaranteed is the work: a compliant project report, correctly structured documents, the MSME filing and follow-up with the department.",
  },
  {
    question: "How does the interest subvention actually reach me?",
    answer:
      "You pay the monthly EMI to the branch. The branch records the repayment, the District Industry Centre files the subvention claim with the state treasury, and the state credits the interest amount back to your account. It is a reimbursement loop, so prompt repayment is what keeps it running.",
  },
  {
    question: "Which businesses count as manufacturing?",
    answer:
      "Flour mills, spice grinding, oil mills, paper box manufacturing, textile weaving, garment packaging, soap making, building block and fly-ash brick units, bio-fertiliser plants and agro-processing operations, among others.",
  },
  {
    question: "Which businesses count as service sector?",
    answer:
      "Diagnostic laboratories, software development, cyber cafés and IT consulting, auto repair garages, mobile and appliance servicing, plumbing and HVAC consulting, coaching institutes, gyms, and professional practices such as accounting or legal advisory.",
  },
  {
    question: "Is my CIBIL score checked?",
    answer:
      "Yes. The bank pulls your credit report. An active default, a write-off or a settlement on record will fail the credit evaluation regardless of how good the project is.",
  },
  {
    question: "Can I apply if I already have a business loan running?",
    answer:
      "Generally not, since the scheme is aimed at new enterprises. If the earlier credit is fully repaid and closed with a No Objection Certificate, you can file a fresh application.",
  },
  {
    question: "What does DigiConnect charge, and what is included?",
    answer:
      "One fee, paid once — the amount shown in the pricing section above. It covers the Detailed Project Report, MSME/Udyam registration, document review, portal submission and follow-up with the department. Government and bank charges, if any, are separate and paid to them directly.",
  },
  {
    question: "How do I track my application?",
    answer:
      "Every stage change is pushed to your verified WhatsApp number and recorded against your application in the customer portal, so you can check the current stage yourself at any time.",
  },
  {
    question: "How do I get started?",
    answer:
      "Check the eligibility list on this page against your own profile, then apply online — the form saves as you go, so you can start without every document in hand. If you would rather ask first, message the team on WhatsApp.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Related services
   ───────────────────────────────────────────────────────────────────────── */

export const RELATED_SERVICES = [
  {
    slug: "detailed-project-report",
    title: "Detailed Project Report",
    detail: "The bank-format DPR on its own, for a file you are assembling yourself.",
  },
  {
    slug: "msme-registration",
    title: "MSME / Udyam registration",
    detail: "Register the enterprise before a loan file goes in.",
  },
  {
    slug: "gst-registration",
    title: "GST registration",
    detail: "GSTIN for compliance, tenders and supplier accounts.",
  },
  {
    slug: "cibil-report-increase",
    title: "CIBIL report & score help",
    detail: "See what the branch will see, and clean it up before they pull it.",
  },
] as const;

/** Topics that make a published blog article relevant to this page. */
export const ARTICLE_TOPICS = [
  "cm yuva",
  "yuva",
  "loan",
  "scheme",
  "subsidy",
  "msme",
  "udyam",
  "project report",
  "entrepreneur",
] as const;
