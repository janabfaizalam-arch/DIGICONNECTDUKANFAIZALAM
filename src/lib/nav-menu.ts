import {
  Building2,
  CarFront,
  CreditCard,
  HandCoins,
  Landmark,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Header navigation menus.
 *
 * This is a deliberately small, static module rather than a read of
 * `services-data.ts` or a fetch. The header renders on every page and is a
 * client component, so importing the catalogue would pull its FAQ and blog
 * builders into the bundle of every route — for the sake of seven labels.
 *
 * Every slug below is a real entry in the catalogue. If one is renamed there
 * and not here, the link 404s, so the two lists have to be kept in step; the
 * test in `nav-menu.test.ts` fails when they drift.
 */

export type NavCategory = {
  title: string;
  slug: string;
  blurb: string;
  icon: LucideIcon;
  featured: { label: string; slug: string }[];
};

export const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Tax & GST",
    slug: "tax",
    blurb: "GST registration, returns and ITR filing",
    icon: ReceiptText,
    featured: [
      { label: "GST Registration", slug: "gst-registration" },
      { label: "ITR Filing", slug: "itr-filing" },
      { label: "GST Return Filing", slug: "gst-return-filing" },
    ],
  },
  {
    title: "Passport & Licence",
    slug: "licence",
    blurb: "Passport applications and driving licence",
    icon: CarFront,
    featured: [
      { label: "Passport", slug: "passport" },
      { label: "Learning Driving Licence", slug: "learning-driving-license" },
    ],
  },
  {
    title: "Company & Compliance",
    slug: "company",
    blurb: "Private Limited, OPC, MSME, DSC and ISO",
    icon: Building2,
    featured: [
      { label: "Private Limited Registration", slug: "private-limited-registration" },
      { label: "MSME Registration", slug: "msme-registration" },
      { label: "Digital Signature (DSC)", slug: "dsc" },
    ],
  },
  {
    title: "Loans & Schemes",
    slug: "loans",
    blurb: "PMEGP, Mudra, PM Vishwakarma and DPR",
    icon: HandCoins,
    featured: [
      { label: "Mudra Loan", slug: "mudra-loan" },
      { label: "PMEGP Loan", slug: "pmegp-loan" },
      { label: "Detailed Project Report", slug: "detailed-project-report" },
    ],
  },
  {
    title: "Banking & Credit",
    slug: "banking",
    blurb: "Accounts, credit cards and CIBIL support",
    icon: Landmark,
    featured: [
      { label: "CIBIL Report & Increase", slug: "cibil-report-increase" },
      { label: "Credit Cards", slug: "credit-cards" },
    ],
  },
  {
    title: "Cards & PVC Printing",
    slug: "cards",
    blurb: "Aadhaar, Voter ID, eShram and Labour cards",
    icon: CreditCard,
    featured: [
      { label: "PVC Card Printing", slug: "pvc-card" },
      { label: "Voter ID", slug: "voter-id" },
    ],
  },
  {
    title: "Insurance",
    slug: "insurance",
    blurb: "Two-wheeler, car and commercial vehicle",
    icon: ShieldCheck,
    featured: [{ label: "Vehicle Insurance", slug: "insurance" }],
  },
];

/** Government scheme filings, for the Schemes menu. */
export const NAV_SCHEMES: { label: string; slug: string; blurb: string }[] = [
  { label: "PM Vishwakarma Yojana", slug: "pm-vishwakarma-yojana", blurb: "Artisan and craftsperson scheme" },
  { label: "Mudra Loan", slug: "mudra-loan", blurb: "Shishu, Kishor and Tarun categories" },
  { label: "PMEGP Loan", slug: "pmegp-loan", blurb: "Employment generation programme" },
  { label: "Startup India", slug: "startup-india-assistance", blurb: "Recognition and registration support" },
  { label: "MSME / Udyam", slug: "msme-registration", blurb: "Priority lending and subsidies" },
  {
    label: "CM Yuva Entrepreneur Loan",
    slug: "cm-yuva-entrepreneur-loan-assistance",
    blurb: "State youth entrepreneurship loan",
  },
  { label: "Ayushman Card", slug: "ayushman-card", blurb: "Health cover enrolment assistance" },
];

/** The handful people arrive for, shown alongside the category grid. */
export const NAV_POPULAR: { label: string; slug: string }[] = [
  { label: "GST Registration", slug: "gst-registration" },
  { label: "ITR Filing", slug: "itr-filing" },
  { label: "Passport", slug: "passport" },
  { label: "Driving Licence", slug: "learning-driving-license" },
  { label: "CIBIL Report", slug: "cibil-report-increase" },
  { label: "PVC Card", slug: "pvc-card" },
];
