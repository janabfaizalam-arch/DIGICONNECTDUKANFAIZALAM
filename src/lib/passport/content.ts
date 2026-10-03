/**
 * Passport assistance page — copy and visual slots.
 *
 * Nothing here is a price. The figure the page shows is read from the
 * `services` row on the server, and the figure a customer pays is read from
 * `agent_services` inside /api/create-order. This file only says what the
 * service is, in words that stay true whatever that figure becomes.
 *
 * The copy is careful on purpose. DigiConnect Dukan is a private assistance
 * service: it does not issue passports, allot appointments or decide
 * verification, so nothing here promises any of those.
 */

export const PASSPORT_SLUG = "passport";

export const PASSPORT_DISCLAIMER =
  "DigiConnect Dukan is a private digital assistance platform and is not a government website or affiliated with Passport Seva / Government of India. Passports are issued only by the Ministry of External Affairs. Official fees are paid separately on the Passport Seva portal and are not part of our service charge.";

/* ─────────────────────────────────────────────────────────────────────────
   Visual slots
   ─────────────────────────────────────────────────────────────────────────
   One entry per scene. `src: null` means the artwork has not been added to
   /public yet, and the section draws its own code-built scene instead — so a
   missing file can never become a broken image. To add one, save the WebP at
   the path in the comment and set `src` to it. */

export type PassportVisual = {
  src: string | null;
  alt: string;
  width: number;
  height: number;
};

export const PASSPORT_VISUALS = {
  hero: {
    src: "/images/services/passport/hero-airport.webp",
    alt: "The DigiConnect mascot holding an Indian passport at a modern airport, with a glowing map of India behind",
    width: 1672,
    height: 941,
  },
  heroPortrait: {
    src: "/images/services/passport/hero-airport-portrait.webp",
    alt: "The DigiConnect mascot holding an Indian passport at a modern airport",
    width: 529,
    height: 941,
  },
  application: {
    src: "/images/services/passport/application-desk.webp",
    alt: "The DigiConnect mascot walking a customer through a passport application checklist on a tablet",
    width: 1672,
    height: 941,
  },
  // /images/services/passport/documents-checklist.webp
  documents: { src: null, alt: "The DigiConnect mascot beside a checklist of passport documents", width: 1448, height: 1086 },
  // /images/services/passport/photo-studio.webp
  photo: { src: null, alt: "The DigiConnect mascot in a photo studio showing a correct passport photograph and common mistakes", width: 1672, height: 941 },
  // /images/services/passport/appointment.webp
  appointment: { src: null, alt: "The DigiConnect mascot showing an appointment calendar on a phone", width: 1672, height: 941 },
  // /images/services/passport/security-vault.webp
  security: { src: null, alt: "The DigiConnect mascot beside a glass vault holding a passport and documents", width: 1672, height: 941 },
  // /images/services/passport/journey-timeline.webp
  timeline: { src: null, alt: "The DigiConnect mascot walking along a glowing timeline of passport application steps", width: 1672, height: 941 },
  // /images/services/passport/family.webp
  family: { src: null, alt: "The DigiConnect mascot helping an Indian family with their passport documents", width: 1672, height: 941 },
  // /images/services/passport/airport-travel.webp
  travel: { src: null, alt: "The DigiConnect mascot with a passport and suitcase at an airport window at sunset", width: 1672, height: 941 },
  // /images/services/passport/final-cta.webp
  finalCta: { src: null, alt: "The DigiConnect mascot giving a thumbs up with a passport on a glass platform at an airport", width: 1672, height: 941 },
} satisfies Record<string, PassportVisual>;

export const PASSPORT_OG_IMAGE = "/images/services/passport/og-passport.jpg";

/* ─────────────────────────────────────────────────────────────────────────
   What the service charge covers
   ───────────────────────────────────────────────────────────────────────── */

export const PASSPORT_INCLUSIONS = [
  "Document guidance",
  "Application assistance",
  "Process guidance",
  "Appointment guidance",
  "Status guidance",
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   The journey
   ───────────────────────────────────────────────────────────────────────── */

export type JourneyIcon =
  | "documents"
  | "application"
  | "appointment"
  | "verification"
  | "processing"
  | "passport"
  | "travel";

export const PASSPORT_JOURNEY: { icon: JourneyIcon; title: string; body: string; who: string }[] = [
  { icon: "documents", title: "Documents", body: "We tell you exactly which proofs your case needs and check them before anything is filed.", who: "With DigiConnect" },
  { icon: "application", title: "Application", body: "Your form is prepared with you on the Passport Seva portal, details matched to your documents.", who: "With DigiConnect" },
  { icon: "appointment", title: "Appointment", body: "We guide you through booking a slot at your Passport Seva Kendra and what to carry on the day.", who: "With DigiConnect" },
  { icon: "verification", title: "Verification", body: "Biometrics and document checks at the Kendra, then police verification where it applies.", who: "Passport Seva & Police" },
  { icon: "processing", title: "Processing", body: "The Passport Office reviews your file. Timelines are set by them, not by us.", who: "Passport Office" },
  { icon: "passport", title: "Passport", body: "Once approved, your passport is printed and dispatched to you by Speed Post.", who: "Passport Office" },
  { icon: "travel", title: "Your Journey Begins", body: "Passport in hand. Wherever you are going next, it starts here.", who: "You" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Documents
   ───────────────────────────────────────────────────────────────────────── */

export type DocumentIcon = "identity" | "address" | "birth" | "photo" | "support";

export const PASSPORT_DOCUMENTS: { id: string; icon: DocumentIcon; title: string; body: string; examples: string }[] = [
  {
    id: "identity",
    icon: "identity",
    title: "Identity Proof",
    body: "A government photo ID in your own name.",
    examples: "Aadhaar, PAN card, Voter ID",
  },
  {
    id: "address",
    icon: "address",
    title: "Address Proof",
    body: "Proof of where you live now — this decides your Passport Office.",
    examples: "Aadhaar, bank passbook, utility bill",
  },
  {
    id: "birth",
    icon: "birth",
    title: "Date of Birth",
    body: "One document that shows your full date of birth.",
    examples: "Birth certificate, Class 10 marksheet",
  },
  {
    id: "photo",
    icon: "photo",
    title: "Photograph",
    body: "A recent photograph for your file. Your passport photo is captured at the Kendra.",
    examples: "Plain background, face clearly visible",
  },
  {
    id: "support",
    icon: "support",
    title: "Supporting Documents",
    body: "Only if your case needs them — we will tell you which.",
    examples: "Old passport, ECNR proof, annexures",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Photograph
   ───────────────────────────────────────────────────────────────────────── */

export const PHOTO_RULES = [
  { title: "Face the camera", body: "Head straight, both ears visible, eyes open." },
  { title: "Neutral expression", body: "Mouth closed, no big smile." },
  { title: "Plain background", body: "Light, even background with no shadows." },
  { title: "Dress in a colour", body: "Avoid white — it blends into the background." },
] as const;

export const PHOTO_MISTAKES = [
  { kind: "tilt", label: "Head turned" },
  { kind: "glasses", label: "Glare on glasses" },
  { kind: "shadow", label: "Shadowed background" },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Appointment
   ───────────────────────────────────────────────────────────────────────── */

export const APPOINTMENT_POINTS = [
  { title: "Choosing your Kendra", body: "Which Passport Seva Kendra or Post Office Passport Seva Kendra serves your address." },
  { title: "Booking a slot", body: "How to pick from the dates the portal has open. Slots are allotted by Passport Seva, as available." },
  { title: "What to carry", body: "Originals and self-attested copies, in the order the counter asks for them." },
  { title: "On the day", body: "Token, document check, biometrics and photo — what each counter does." },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Security
   ───────────────────────────────────────────────────────────────────────── */

export const SECURITY_POINTS = [
  { title: "Encrypted connection", body: "Pages and uploads travel over HTTPS." },
  { title: "Controlled access", body: "Your documents are visible to you and to the staff handling your application." },
  { title: "Your own dashboard", body: "Uploads and updates sit behind your login, not in a chat thread." },
  { title: "Only what is needed", body: "We ask for the documents your application needs, and nothing more." },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Family
   ───────────────────────────────────────────────────────────────────────── */

export const FAMILY_POINTS = [
  { who: "Parents", body: "Each adult files their own application, with their own documents." },
  { who: "Children", body: "Minors apply with parents' details and consent, and a parent attends the appointment." },
  { who: "Together", body: "We help you line the applications up so the family's documents are ready at once." },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Trust — things that are simply true about the service. No counts, ratings
   or years: none of those have been measured.
   ───────────────────────────────────────────────────────────────────────── */

export const PASSPORT_TRUST = [
  { title: "Professional Assistance", body: "Trained staff prepare your file with you." },
  { title: "Transparent Pricing", body: "One service charge. Official fees shown separately." },
  { title: "Secure Digital Workflow", body: "Uploads and updates inside your own dashboard." },
  { title: "Human Support", body: "Real people on WhatsApp and phone." },
  { title: "Clear Process", body: "You always know what happens next." },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   FAQ — rendered on the page and mirrored in FAQPage schema, so the schema
   only ever describes questions a visitor can actually see.
   `{price}` is replaced with the live service charge.
   ───────────────────────────────────────────────────────────────────────── */

export const PASSPORT_FAQS: { question: string; answer: string }[] = [
  {
    question: "What is included in the {price} service?",
    answer:
      "Our service charge covers professional assistance through your application: guidance on which documents your case needs and a check of them, help preparing and submitting the online form on the Passport Seva portal, guidance on booking your appointment and what to carry, and guidance on following your application's status afterwards. It does not include the official passport fee.",
  },
  {
    question: "What documents are required?",
    answer:
      "Most applicants need a proof of date of birth, a proof of present address and a photo identity document — Aadhaar is commonly used for address and identity. Some cases need more: an old passport for re-issue, proof for ECNR status, or annexures for minors and other situations. The exact list depends on your case, and we confirm it with you before anything is submitted.",
  },
  {
    question: "Is the government fee included?",
    answer:
      "No. The official passport fee is separate from our service charge and is paid on the Passport Seva portal as per the Ministry of External Affairs' fee schedule. It varies with the application type, booklet size, age of the applicant and whether you choose Normal or Tatkaal.",
  },
  {
    question: "Is the appointment guaranteed?",
    answer:
      "No. Appointment slots are allotted by Passport Seva according to availability at each Kendra. We guide you through booking the earliest slot that suits you from the dates the portal has open, but we cannot reserve or guarantee a slot.",
  },
  {
    question: "What is the difference between a fresh passport and a re-issue?",
    answer:
      "A fresh passport is for someone who has never held an Indian passport. A re-issue is for an existing passport holder — when the passport has expired or is about to, the pages are used up, personal details have changed, or it has been lost or damaged.",
  },
  {
    question: "Can minors apply?",
    answer:
      "Yes. Children under 18 can apply for a passport. The application needs the parents' details and supporting documents, consent from the parents is usually required, and a parent normally accompanies the child to the appointment. We tell you the exact documents for your child's case.",
  },
  {
    question: "How does the process work?",
    answer:
      "You start the application on DigiConnect Dukan and upload your documents. We check them and prepare your Passport Seva form with you, then guide you through booking an appointment. You attend the Passport Seva Kendra for document checks and biometrics; police verification follows where it applies, and the Passport Office then processes and dispatches your passport.",
  },
  {
    question: "How will I know my application status?",
    answer:
      "Our team shares updates with you on WhatsApp and in your DigiConnect Dukan dashboard while we are assisting. The official status of your passport file is shown on the Passport Seva portal using your file number, and we can help you read it.",
  },
  {
    question: "Is DigiConnect Dukan a government website?",
    answer:
      "No. DigiConnect Dukan is a private digital assistance platform run by RNOS India Private Limited. It is not a government website and is not affiliated with Passport Seva or the Government of India. Passports are issued only by the Ministry of External Affairs, and you can always apply directly on the official Passport Seva portal yourself.",
  },
];

export function resolveFaqs(priceText: string) {
  return PASSPORT_FAQS.map((faq) => ({
    question: faq.question.replace("{price}", priceText),
    answer: faq.answer.replace("{price}", priceText),
  }));
}
