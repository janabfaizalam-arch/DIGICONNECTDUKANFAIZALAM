import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Photograph slots on the Labour Card page.
 *
 * The page ships with drawn SVG artwork in every section. These four places
 * would be better with a real photograph — a construction site, a worker's
 * tools, the document set, the shop counter — and each one is declared here
 * with the alt text already written.
 *
 * A slot fills itself: drop a file with the name below into
 * `public/images/services/labour-card/` and that section starts using it on
 * the next deploy. Nothing else to change, and no section is ever blank —
 * until a file exists the illustration stays.
 *
 * Existence is checked once when this module loads rather than per render.
 * The page is `force-dynamic`, so a `statSync` per section would be a
 * filesystem call on every visit for an answer that only changes at deploy.
 */

export type PhotoId =
  | "hero"
  | "trades"
  | "documents"
  | "counter"
  | "family"
  | "education"
  | "marriage"
  | "medical"
  | "disability"
  | "pension"
  | "skill"
  | "residential"
  | "guide";

export type PhotoSlot = {
  id: PhotoId;
  /** File name inside public/images/services/labour-card/ */
  file: string;
  /** What the picture must show, for whoever sources it. */
  subject: string;
  /** Written here so an added photograph is never shipped without alt text. */
  alt: string;
  /** Shown under the image where the layout has room for it. */
  caption: string;
  /** Which part of the page this belongs to — the scheme category where there is one. */
  category: string;
  width: number;
  height: number;
};

export const PHOTO_SLOTS: readonly PhotoSlot[] = [
  {
    id: "hero",
    file: "hero-site.webp",
    subject: "Indian construction site — workers in helmets, scaffolding, a building under construction.",
    alt: "निर्माण स्थल पर हेलमेट पहने श्रमिक काम करते हुए",
    caption: "भवन एवं सन्निर्माण कर्मकार",
    category: "hero",
    width: 1200,
    height: 900,
  },
  {
    id: "trades",
    file: "trades.webp",
    subject: "A mason, carpenter, plumber or electrician at work with their tools.",
    alt: "राजमिस्त्री, बढ़ई और प्लंबर जैसे निर्माण श्रमिक अपने औज़ारों के साथ काम करते हुए",
    caption: "40+ प्रकार के निर्माण कामगार पात्र हैं",
    category: "eligibility",
    width: 960,
    height: 640,
  },
  {
    id: "documents",
    file: "documents.webp",
    subject: "Indian identity and bank documents laid out — Aadhaar, passbook, photographs, a form.",
    alt: "आधार, बैंक पासबुक, फ़ोटो और फ़ॉर्म — लेबर कार्ड के लिए ज़रूरी दस्तावेज़",
    caption: "आवेदन से पहले दस्तावेज़ पूरे रखें",
    category: "documents",
    width: 960,
    height: 640,
  },
  {
    id: "counter",
    file: "counter.webp",
    subject: "A small digital service centre counter — a computer, a printer, someone being helped.",
    alt: "डिजिटल सेवा केंद्र के काउंटर पर ऑनलाइन आवेदन भरते हुए",
    caption: "DigiConnect Dukan काउंटर",
    category: "service",
    width: 960,
    height: 640,
  },
  {
    id: "family",
    file: "family.webp",
    subject: "A mother with a newborn, or a worker's family at home. Dignified, not posed as charity.",
    alt: "श्रमिक परिवार — माता और नवजात शिशु",
    caption: "मातृत्व एवं शिशु हितलाभ",
    category: "child_maternity",
    width: 960,
    height: 640,
  },
  {
    id: "education",
    file: "education.webp",
    subject: "A student in a classroom, ITI workshop or with books. School or college age.",
    alt: "श्रमिक के बच्चे पढ़ाई करते हुए",
    caption: "संत रविदास शिक्षा प्रोत्साहन",
    category: "education",
    width: 960,
    height: 640,
  },
  {
    id: "marriage",
    file: "marriage.webp",
    subject: "An Indian wedding — modest, real, not a stock luxury shoot.",
    alt: "कन्या विवाह — श्रमिक परिवार का विवाह समारोह",
    caption: "कन्या विवाह सहायता",
    category: "marriage",
    width: 960,
    height: 640,
  },
  {
    id: "medical",
    file: "medical.webp",
    subject: "A government or empanelled hospital — reception, ward, or a doctor with a patient.",
    alt: "अस्पताल में इलाज कराते हुए श्रमिक",
    caption: "गंभीर बीमारी सहायता",
    category: "medical",
    width: 960,
    height: 640,
  },
  {
    id: "disability",
    file: "disability.webp",
    subject: "A person with a disability at work or with an assistive device. Dignified, active.",
    alt: "दिव्यांग श्रमिक — सहायता उपकरण के साथ",
    caption: "दिव्यांगता सहायता",
    category: "disability",
    width: 960,
    height: 640,
  },
  {
    id: "pension",
    file: "pension.webp",
    subject: "An older worker, 60+, at home or at a bank. Calm, respectful.",
    alt: "साठ वर्ष से अधिक आयु के श्रमिक",
    caption: "महात्मा गांधी पेंशन योजना",
    category: "pension",
    width: 960,
    height: 640,
  },
  {
    id: "skill",
    file: "skill.webp",
    subject: "A skill-training workshop — welding, electrical or masonry instruction.",
    alt: "कौशल विकास प्रशिक्षण में श्रमिक",
    caption: "कौशल विकास एवं प्रमाणन",
    category: "skill",
    width: 960,
    height: 640,
  },
  {
    id: "residential",
    file: "residential.webp",
    subject: "A residential school — hostel, classroom or children in uniform.",
    alt: "आवासीय विद्यालय में पढ़ते बच्चे",
    caption: "आवासीय विद्यालय योजना",
    category: "residential_education",
    width: 960,
    height: 640,
  },
  {
    id: "guide",
    file: "guide.webp",
    subject: "Generic fallback for a guide or article card that has no image of its own.",
    alt: "श्रमिक सहायता गाइड",
    caption: "श्रमिक सहायता गाइड",
    category: "article",
    width: 800,
    height: 500,
  },
] as const;

const DIRECTORY = "images/services/labour-card";

/**
 * Which slots actually have a file behind them, resolved once at startup.
 */
const PRESENT: ReadonlySet<PhotoId> = new Set(
  PHOTO_SLOTS.filter((slot) => existsSync(path.join(process.cwd(), "public", DIRECTORY, slot.file))).map(
    (slot) => slot.id,
  ),
);

/** The slot with its public path, or null when no file has been added yet. */
export function photoFor(id: PhotoId): (PhotoSlot & { src: string }) | null {
  if (!PRESENT.has(id)) return null;
  const slot = PHOTO_SLOTS.find((entry) => entry.id === id);
  return slot ? { ...slot, src: `/${DIRECTORY}/${slot.file}` } : null;
}

/** For the admin-facing report of what is still missing. */
export function missingPhotos(): PhotoSlot[] {
  return PHOTO_SLOTS.filter((slot) => !PRESENT.has(slot.id));
}
