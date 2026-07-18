export type ServiceItem = {
  title: string;
  slug: string;
  shortDescription: string;
  amount: number;
  documents: string[];
  benefits: string[];
};

export const SERVICES: ServiceItem[] = [
  {
    title: "GST Registration",
    slug: "gst-registration",
    shortDescription: "Complete GST registration assistance for your business.",
    amount: 999,
    documents: ["Aadhaar Card", "PAN Card", "Address Proof", "Bank Details"],
    benefits: ["Expert filing", "Document checklist", "Application tracking"],
  },
  {
    title: "ITR Filing",
    slug: "itr-filing",
    shortDescription: "Income tax return filing for salaried and business customers.",
    amount: 499,
    documents: ["Aadhaar Card", "PAN Card", "Form 16", "Bank Statement"],
    benefits: ["Fast filing", "Error checks", "Acknowledgement support"],
  },
  {
    title: "MSME Registration",
    slug: "msme-registration",
    shortDescription: "Udyam / MSME registration certificate assistance.",
    amount: 499,
    documents: ["Aadhaar Card", "PAN Card", "Business Details"],
    benefits: ["Same-day assistance", "Official Udyam support"],
  },
  {
    title: "FSSAI / Food License",
    slug: "food-license",
    shortDescription: "FSSAI registration and food licence assistance.",
    amount: 999,
    documents: ["Aadhaar Card", "PAN Card", "Passport Photo", "Premises Proof"],
    benefits: ["FSSAI guidance", "Rejection risk reduction"],
  },
  {
    title: "Driving Licence",
    slug: "driving-licence",
    shortDescription: "Learning and permanent driving licence assistance.",
    amount: 999,
    documents: ["Aadhaar Card", "Passport Photo", "Age Proof"],
    benefits: ["Guided RTO process", "Document checklist"],
  },
  {
    title: "Passport Assistance",
    slug: "passport",
    shortDescription: "Fresh passport, re-issue, and correction support.",
    amount: 1999,
    documents: ["Aadhaar Card", "Address Proof", "Photo"],
    benefits: ["Form guidance", "Appointment help"],
  },
  {
    title: "CM YUVA Loan Assistance",
    slug: "cm-yuva-loan",
    shortDescription: "CM YUVA entrepreneur loan file assistance.",
    amount: 1999,
    documents: ["Aadhaar Card", "PAN Card", "Project Details", "Bank Statement"],
    benefits: ["File preparation", "Scheme guidance"],
  },
];

export function getServiceBySlug(slug: string) {
  return SERVICES.find((service) => service.slug === slug) ?? null;
}

export function getAllServiceSlugs() {
  return SERVICES.map((service) => service.slug);
}
