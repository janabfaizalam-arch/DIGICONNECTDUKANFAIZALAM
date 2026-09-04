/**
 * What a customer can ask a print counter for, and what to ask them back.
 *
 * There are three things, because a counter sells three things: a copy of an
 * ID card, a sheet of passport photographs, and a document. It offered ten for
 * a while — "form", "certificate", "photo print", "photos to PDF" — and every
 * one of those was a document or a photograph wearing a different hat. Ten
 * cards on a phone screen is not ten times the choice; it is a customer
 * reading labels to work out which of four identical doors to go through.
 *
 * The second idea here matters more. Almost nothing is asked of the customer.
 * A shop that prints passport photos knows it prints them 35 x 45 on glossy
 * paper at high quality, and there is no reason for every customer to be
 * handed that decision — most of them do not know the answer and the ones who
 * do would have said so at the desk. So each service names the small set of
 * questions a customer always sees, and everything else stays hidden until the
 * partner turns it on for their own shop.
 */

import { PAPER_SIZES, PHOTO_SIZES, type PaperSize } from "@/lib/print/sheet-layout";

export type SmartPrintServiceId = "id_copy" | "passport_photo" | "document";

export type ColorMode = "mono" | "color";
export type PaperFinish = "normal" | "glossy" | "matte";
export type PrintQuality = "standard" | "high" | "premium";
export type BackdropId = "original" | "white" | "blue" | "grey" | "cream";
export type PhotoFilter = "none" | "bright" | "sharp" | "soft" | "mono";

/**
 * Every question this system knows how to ask.
 *
 * Deliberately short. Two-sided printing, N-up, orientation and page ranges
 * were all offered here once and none of them reached the paper: the Print
 * Station passes the printer a copy count, a paper size and a colour mode, and
 * takes duplex from the shop's own local setting rather than from the job. A
 * switch that changes the screen and not the print is worse than no switch —
 * the customer chose "both sides", paid, and got one. They come back when the
 * agent can honour them, not before.
 */
export type SmartPrintAsk =
  | "paper"
  | "color"
  | "finish"
  | "quality"
  | "copies"
  | "photoCount"
  | "photoSize"
  | "arrangement"
  | "backdrop"
  | "filter"
  | "cutBorder";

/** Everything a job can carry. Each service uses the part that applies to it. */
export type SmartPrintSettings = {
  paper: string;
  color: ColorMode;
  finish: PaperFinish;
  quality: PrintQuality;
  /** Copies of the whole thing. */
  copies: number;
  /** Photos on a sheet, for the passport photo. */
  photoCount?: number;
  photoSize?: keyof typeof PHOTO_SIZES | "custom";
  customPhoto?: { width: number; height: number };
  /** What goes behind the person. Only ever the background. */
  backdrop?: BackdropId;
  /** A light touch on the photograph itself — never on a document. */
  filter?: PhotoFilter;
  /** A faint line round each photo so the shop's scissors have something to follow. */
  cutBorder?: boolean;
  /** How an ID's two sides are arranged. */
  arrangement?: "stacked" | "side-by-side" | "actual-size";
};

/**
 * What a shop has decided about one service.
 *
 * The values are its defaults; `allow` is the list of questions it is willing
 * to let a customer answer. Both live in one blob on the station row, which is
 * why `allow` has to be stripped before the rest becomes settings.
 */
export type PartnerServiceConfig = Partial<SmartPrintSettings> & { allow?: SmartPrintAsk[] };
export type PartnerDefaults = Record<string, PartnerServiceConfig>;

export type SmartPrintService = {
  id: SmartPrintServiceId;
  label: string;
  /** One line the customer reads on the card, in their words. */
  blurb: string;
  /** Lucide icon name, resolved by the UI. */
  icon: string;
  /** How many files, and of what kind. */
  uploads: { min: number; max: number; accept: "image" | "document" | "both"; labels?: string[] };
  /** Every question this service could ask. */
  asks: SmartPrintAsk[];
  /** The few it always asks, whatever the shop has configured. */
  always: SmartPrintAsk[];
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
  /** True when an uploaded photo should be squared up and cut out of its
   *  background automatically — a card photographed on a desk. */
  cardScan?: boolean;
};

export const SMART_PRINT_SERVICES: SmartPrintService[] = [
  {
    id: "id_copy",
    label: "Aadhaar / ID copy",
    blurb: "Card ki photo kheenchiye — background hat jayega",
    icon: "IdCard",
    uploads: { min: 1, max: 2, accept: "image", labels: ["Front", "Back"] },
    asks: ["arrangement", "copies", "paper", "color", "finish", "quality"],
    always: ["arrangement", "copies"],
    preset: {
      paper: "A4",
      color: "mono",
      finish: "normal",
      quality: "standard",
      copies: 1,
      arrangement: "stacked",
    },
    composes: true,
    cardScan: true,
  },
  {
    id: "passport_photo",
    label: "Passport size photo",
    blurb: "Ek photo, poora sheet — kaatne ke liye taiyar",
    icon: "UserSquare",
    uploads: { min: 1, max: 1, accept: "image", labels: ["Aapki photo"] },
    asks: ["photoCount", "backdrop", "filter", "cutBorder", "photoSize", "finish", "quality", "color", "paper"],
    always: ["photoCount", "backdrop", "filter", "cutBorder"],
    preset: {
      paper: "A4",
      color: "color",
      finish: "glossy",
      quality: "high",
      copies: 1,
      photoSize: "35x45",
      photoCount: 12,
      backdrop: "original",
      filter: "none",
      cutBorder: true,
    },
    composes: true,
    retouch: true,
  },
  {
    id: "document",
    label: "Document / PDF",
    blurb: "PDF ya photo — jaisa hai waisa print",
    icon: "FileText",
    uploads: { min: 1, max: 1, accept: "both", labels: ["Aapki file"] },
    asks: ["copies", "color", "paper", "quality"],
    always: ["copies", "color"],
    preset: {
      paper: "A4",
      color: "mono",
      finish: "normal",
      quality: "standard",
      copies: 1,
    },
    composes: false,
  },
];

export function smartPrintService(id: string): SmartPrintService | null {
  return SMART_PRINT_SERVICES.find((service) => service.id === id) ?? null;
}

/**
 * The settings a service starts with for this shop.
 *
 * The partner's values win over ours, and only for the keys they actually set
 * — a shop that only ever wants 8 passport photos should not have to restate
 * the paper, the finish and the quality to say so. `allow` is a permission
 * rather than a setting, so it is dropped here.
 */
export function settingsFor(
  service: SmartPrintService,
  partnerDefaults?: PartnerDefaults | null,
): SmartPrintSettings {
  const config = partnerDefaults?.[service.id] ?? {};
  const shop: Partial<SmartPrintSettings> = { ...config };
  delete (shop as PartnerServiceConfig).allow;
  return { ...service.preset, ...shop };
}

/**
 * The questions this shop's customers actually see.
 *
 * A shop that has enabled nothing gets the short list, which is the point: a
 * customer printing an Aadhaar copy is asked how their two sides should sit
 * and how many copies, and is not handed a paper-size menu they have no way of
 * having an opinion about.
 */
export function askedOf(service: SmartPrintService, partnerDefaults?: PartnerDefaults | null): SmartPrintAsk[] {
  const allowed = new Set(partnerDefaults?.[service.id]?.allow ?? []);
  return service.asks.filter((ask) => service.always.includes(ask) || allowed.has(ask));
}

/** The questions a partner may hand over, in the order their screen shows them. */
export function optionalAsks(service: SmartPrintService): SmartPrintAsk[] {
  return service.asks.filter((ask) => !service.always.includes(ask));
}

/** The paper a service is printed on, resolved from its settings. */
export function paperFor(settings: SmartPrintSettings): PaperSize {
  return PAPER_SIZES[settings.paper] ?? PAPER_SIZES.A4;
}

export const QUANTITY_CHOICES = {
  copies: [1, 2, 3, 5, 10],
  photoCount: [6, 8, 12, 18, 24, 36],
} as const;

export const FINISH_LABELS: Record<PaperFinish, string> = {
  normal: "Normal",
  glossy: "Glossy",
  matte: "Matte",
};

export const QUALITY_LABELS: Record<PrintQuality, string> = {
  standard: "Normal",
  high: "High",
  premium: "Premium",
};

export const ASK_LABELS: Record<SmartPrintAsk, string> = {
  paper: "Paper size",
  color: "Rang",
  finish: "Paper type",
  quality: "Quality",
  copies: "Copies",
  photoCount: "Kitni photo",
  photoSize: "Photo size",
  arrangement: "Front aur back",
  backdrop: "Background",
  filter: "Filter",
  cutBorder: "Cutting line",
};

export const FILTER_LABELS: Record<PhotoFilter, string> = {
  none: "Original",
  bright: "Bright",
  sharp: "Sharp",
  soft: "Soft",
  mono: "Black & white",
};
