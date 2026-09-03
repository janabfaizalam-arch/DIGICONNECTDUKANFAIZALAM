/**
 * What a customer can ask a print counter for, and what to ask them back.
 *
 * The counter page used to offer one thing — a file, a paper size, mono or
 * colour — and left everything a shop actually does to the person behind the
 * desk. Twelve passport photos, an Aadhaar front and back on one A4, four ID
 * cards to a page: all of that was a conversation, and the customer had to be
 * standing there to have it.
 *
 * This is that conversation, written down. Each service says what it needs
 * uploaded, what it may ask, and what it should assume — so the customer sees
 * six taps instead of a printer's settings dialog, and a partner can change
 * the assumptions once for their whole shop.
 */

import { PAPER_SIZES, PHOTO_SIZES, type PaperSize } from "@/lib/print/sheet-layout";

export type SmartPrintServiceId =
  | "id_copy"
  | "passport_photo"
  | "photo_print"
  | "document"
  | "form"
  | "certificate"
  | "id_card_sheet"
  | "multi_photo"
  | "image_to_pdf"
  | "other";

export type ColorMode = "mono" | "color";
export type PaperFinish = "normal" | "glossy" | "matte";
export type PrintQuality = "standard" | "high" | "premium";

/** Everything a job can carry. Each service uses the part that applies to it. */
export type SmartPrintSettings = {
  paper: string;
  color: ColorMode;
  finish: PaperFinish;
  quality: PrintQuality;
  /** Copies of the whole thing. */
  copies: number;
  /** Photos on a sheet, for the photo services. */
  photoCount?: number;
  photoSize?: keyof typeof PHOTO_SIZES | "custom";
  customPhoto?: { width: number; height: number };
  /** How an ID's two sides are arranged. */
  arrangement?: "stacked" | "side-by-side" | "actual-size";
  /** Cards per page, for the ID card sheet. */
  perPage?: number;
  /** Documents. */
  duplex?: boolean;
  pagesPerSheet?: number;
  orientation?: "portrait" | "landscape";
  pageRange?: string;
  border?: boolean;
};

export type SmartPrintService = {
  id: SmartPrintServiceId;
  label: string;
  /** One line the customer reads on the card, in their words. */
  blurb: string;
  /** Lucide icon name, resolved by the UI. */
  icon: string;
  /** How many files, and of what kind. */
  uploads: { min: number; max: number; accept: "image" | "document" | "both"; labels?: string[] };
  /** What the customer may change. Anything absent is not shown at all. */
  asks: Array<
    | "paper"
    | "color"
    | "finish"
    | "quality"
    | "copies"
    | "photoCount"
    | "photoSize"
    | "arrangement"
    | "perPage"
    | "duplex"
    | "pagesPerSheet"
    | "orientation"
    | "border"
    | "pageRange"
  >;
  /** What it assumes until the customer or the partner says otherwise. */
  preset: SmartPrintSettings;
  /** True when the browser composes a print-ready sheet for this service. */
  composes: boolean;
  /**
   * Whether the customer is offered brightness, contrast and rotation.
   *
   * Photographs, yes: a phone picture of a face is usually dark and flat, and
   * a shop would fix that before printing. Documents, never. "Never alter the
   * actual document information" is the rule, and an Aadhaar card with the
   * contrast pushed up is a document an office can refuse — so the tools are
   * not offered where the answer should always be no.
   */
  retouch?: boolean;
};

const DOC_PRESET: SmartPrintSettings = {
  paper: "A4",
  color: "mono",
  finish: "normal",
  quality: "standard",
  copies: 1,
  duplex: false,
  pagesPerSheet: 1,
  orientation: "portrait",
};

export const SMART_PRINT_SERVICES: SmartPrintService[] = [
  {
    id: "id_copy",
    label: "Aadhaar / ID copy",
    blurb: "Front and back, laid out on one page",
    icon: "IdCard",
    uploads: { min: 1, max: 2, accept: "image", labels: ["Front", "Back"] },
    asks: ["arrangement", "color", "copies", "paper"],
    preset: { ...DOC_PRESET, arrangement: "stacked", color: "mono", copies: 1 },
    composes: true,
  },
  {
    id: "passport_photo",
    label: "Passport size photo",
    blurb: "One photo, a full sheet ready to cut",
    icon: "UserSquare",
    uploads: { min: 1, max: 1, accept: "image" },
    asks: ["photoSize", "photoCount", "finish", "quality", "color"],
    retouch: true,
    preset: {
      paper: "A4",
      color: "color",
      finish: "glossy",
      quality: "high",
      copies: 1,
      photoSize: "35x45",
      photoCount: 12,
    },
    composes: true,
  },
  {
    id: "photo_print",
    label: "Photo print",
    blurb: "4 × 6, 5 × 7 and the usual sizes",
    icon: "Image",
    uploads: { min: 1, max: 1, accept: "image" },
    asks: ["paper", "finish", "quality", "copies", "border", "orientation"],
    retouch: true,
    preset: {
      paper: "4x6",
      color: "color",
      finish: "glossy",
      quality: "high",
      copies: 1,
      border: false,
      orientation: "portrait",
    },
    composes: true,
  },
  {
    id: "document",
    label: "Document / PDF",
    blurb: "Any PDF or picture, printed as it is",
    icon: "FileText",
    uploads: { min: 1, max: 1, accept: "both" },
    asks: ["paper", "color", "copies", "duplex", "pagesPerSheet", "orientation", "pageRange"],
    preset: DOC_PRESET,
    composes: false,
  },
  {
    id: "form",
    label: "Form / application",
    blurb: "Government forms, printed the way offices want",
    icon: "ClipboardList",
    uploads: { min: 1, max: 1, accept: "both" },
    // Deliberately short: a form is A4, black and white, one side. Asking
    // anything else invites a wrong answer.
    asks: ["copies", "color"],
    preset: DOC_PRESET,
    composes: false,
  },
  {
    id: "certificate",
    label: "Certificate",
    blurb: "Good paper, good quality, one page",
    icon: "Award",
    uploads: { min: 1, max: 1, accept: "both" },
    asks: ["color", "finish", "quality", "copies"],
    preset: { ...DOC_PRESET, color: "color", quality: "high", finish: "matte" },
    composes: false,
  },
  {
    id: "id_card_sheet",
    label: "ID card sheet",
    blurb: "Several cards to a page, cut and go",
    icon: "CreditCard",
    uploads: { min: 1, max: 2, accept: "image", labels: ["Front", "Back"] },
    asks: ["perPage", "color", "copies"],
    preset: { ...DOC_PRESET, perPage: 4, color: "color" },
    composes: true,
  },
  {
    id: "multi_photo",
    label: "Many photos on a sheet",
    blurb: "Upload several, we arrange them",
    icon: "Images",
    uploads: { min: 2, max: 20, accept: "image" },
    asks: ["paper", "finish", "quality", "copies"],
    retouch: true,
    preset: {
      paper: "A4",
      color: "color",
      finish: "glossy",
      quality: "high",
      copies: 1,
    },
    composes: true,
  },
  {
    id: "image_to_pdf",
    label: "Photos to PDF",
    blurb: "Turn pictures into one document",
    icon: "FileStack",
    uploads: { min: 1, max: 20, accept: "image" },
    asks: ["paper", "color", "orientation", "copies"],
    preset: { ...DOC_PRESET, paper: "A4" },
    composes: true,
  },
  {
    id: "other",
    label: "Something else",
    blurb: "Upload it and tell the shop what you need",
    icon: "Printer",
    uploads: { min: 1, max: 1, accept: "both" },
    asks: ["paper", "color", "copies", "quality"],
    preset: DOC_PRESET,
    composes: false,
  },
];

export function smartPrintService(id: string): SmartPrintService | null {
  return SMART_PRINT_SERVICES.find((service) => service.id === id) ?? null;
}

/**
 * The settings a service starts with for this shop.
 *
 * The partner's defaults win over ours, and only for the keys they actually
 * set — a shop that only ever wants 8 passport photos should not have to
 * restate the paper, the finish and the quality to say so.
 */
export function settingsFor(
  service: SmartPrintService,
  partnerDefaults?: Record<string, Partial<SmartPrintSettings>> | null,
): SmartPrintSettings {
  const shop = partnerDefaults?.[service.id] ?? {};
  return { ...service.preset, ...shop };
}

/** The paper a service is printed on, resolved from its settings. */
export function paperFor(settings: SmartPrintSettings): PaperSize {
  return PAPER_SIZES[settings.paper] ?? PAPER_SIZES.A4;
}

export const QUANTITY_CHOICES = {
  copies: [1, 2, 3, 5, 10],
  photoCount: [6, 8, 12, 18, 24, 36],
  perPage: [2, 4, 6],
  pagesPerSheet: [1, 2, 4, 6],
} as const;

export const FINISH_LABELS: Record<PaperFinish, string> = {
  normal: "Normal",
  glossy: "Glossy",
  matte: "Matte",
};

export const QUALITY_LABELS: Record<PrintQuality, string> = {
  standard: "Standard",
  high: "High",
  premium: "Premium",
};
