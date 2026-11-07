/**
 * The commercial fine print shown wherever a price is shown. Not prices —
 * those live in the database — but the terms every price is subject to.
 */

export const COMMERCIAL_NOTES: { title: string; text: string }[] = [
  { title: "GST extra", text: "All prices exclude GST, which is charged as applicable (currently 18% on digital services)." },
  { title: "Setup fee is separate", text: "Every plan has a one-time setup fee, paid before work starts, in addition to the monthly fee." },
  { title: "12-month minimum", text: "Website-development plans carry a minimum commitment of 12 months from the go-live month." },
  {
    title: "Renewal and cancellation",
    text: "After the minimum term, plans continue month to month until either side gives 30 days' written notice. The setup fee is not refundable once work has started.",
  },
  { title: "Domain and hosting", text: "Domain registration and hosting are charged separately where they are not included in your quotation." },
  { title: "Third-party charges", text: "Payment gateway fees, WhatsApp/SMS provider charges, paid plugins, APIs and software subscriptions are separate." },
  { title: "Advertising budget", text: "Ad spend on Meta, Google or any other platform is always separate and paid by you directly to the platform." },
  { title: "Work outside scope", text: "Anything beyond the plan's listed scope and limits is quoted separately before it is done. No plan includes unlimited work or unlimited revisions." },
];

export const ONBOARDING_STEPS: { title: string; text: string }[] = [
  { title: "Enquiry", text: "Choose a plan and tell us about your business. No payment is taken." },
  { title: "Discovery call", text: "We understand your goals and confirm what the plan should include." },
  { title: "Quotation", text: "You receive a written quotation with the monthly fee, setup fee, add-ons, GST and terms." },
  { title: "Your approval", text: "You review and approve the quotation online. Nothing starts until you do." },
  { title: "Setup and kick-off", text: "After the setup payment, we collect your content and begin design." },
  { title: "Launch and monthly care", text: "Your website goes live and monthly maintenance and services begin." },
];

export const GENERAL_FAQS: { question: string; answer: string }[] = [
  {
    question: "Does clicking Get Started charge me anything?",
    answer: "No. It sends us an enquiry. We call you, prepare a written quotation, and nothing starts or is billed until you approve it.",
  },
  {
    question: "Why is there a 12-month minimum?",
    answer: "Building a website takes real setup work, and the monthly fee is set low by spreading that work across the first year. After 12 months you can continue month to month.",
  },
  {
    question: "Who owns the website and the domain?",
    answer: "The domain is registered in your business name. Ownership of the design and content on exit is set out in your quotation and agreement.",
  },
  {
    question: "Can I change plans?",
    answer: "Yes. Moving up takes effect from the next billing month, with any extra setup work quoted. Moving down is possible after the minimum term.",
  },
  {
    question: "Are prices the same for every business?",
    answer: "The listed prices apply to the scope described. If your needs are larger, the quotation will say so before you agree to anything.",
  },
];
