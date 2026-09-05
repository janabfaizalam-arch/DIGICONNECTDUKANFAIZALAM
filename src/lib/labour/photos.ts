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

export type PhotoId = "hero" | "trades" | "documents" | "counter";

export type PhotoSlot = {
  id: PhotoId;
  /** File name inside public/images/services/labour-card/ */
  file: string;
  /** What the picture must show, for whoever sources it. */
  subject: string;
  /** Written here so an added photograph is never shipped without alt text. */
  alt: string;
  width: number;
  height: number;
};

export const PHOTO_SLOTS: readonly PhotoSlot[] = [
  {
    id: "hero",
    file: "hero-site.webp",
    subject: "Indian construction site — workers in helmets, scaffolding, a building under construction.",
    alt: "Nirman sthal par helmet pehne shramik kaam karte hue",
    width: 1200,
    height: 900,
  },
  {
    id: "trades",
    file: "trades.webp",
    subject: "A mason, carpenter, plumber or electrician at work with their tools.",
    alt: "Raj mistri, carpenter aur plumber jaise nirman shramik apne auzaron ke saath kaam karte hue",
    width: 960,
    height: 640,
  },
  {
    id: "documents",
    file: "documents.webp",
    subject: "Indian identity and bank documents laid out — Aadhaar, passbook, photographs, a form.",
    alt: "Aadhaar, bank passbook, photo aur form — Labour Card ke liye zaroori documents",
    width: 960,
    height: 640,
  },
  {
    id: "counter",
    file: "counter.webp",
    subject: "A small digital service centre counter — a computer, a printer, someone being helped.",
    alt: "Digital service centre ke counter par online application bharte hue",
    width: 960,
    height: 640,
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
