/**
 * Where things sit on a sheet of paper.
 *
 * This is the part of Smart Print that has to be exactly right and the part a
 * screenshot cannot check: a passport photo printed 2mm short is not a
 * passport photo, and an Aadhaar card stretched to fill a box is a document
 * somebody will be turned away for. So every measurement is in millimetres,
 * nothing is ever scaled non-uniformly, and all of it is a pure function with
 * tests rather than something the canvas works out as it draws.
 *
 * The browser composes the finished sheet from these placements and uploads
 * that image as the job's file, which means the preview a customer approves
 * and the file the printer receives are the same artifact. There is no second
 * layout engine on the server to drift away from this one.
 */

export type Mm = number;

export type PaperSize = {
  id: string;
  label: string;
  width: Mm;
  height: Mm;
  /** Photo paper is priced and stocked differently from plain paper. */
  photo?: boolean;
};

/** ISO and Indian shop paper, plus the photo sizes a counter actually keeps. */
export const PAPER_SIZES: Record<string, PaperSize> = {
  A4: { id: "A4", label: "A4", width: 210, height: 297 },
  A3: { id: "A3", label: "A3", width: 297, height: 420 },
  A5: { id: "A5", label: "A5", width: 148, height: 210 },
  Legal: { id: "Legal", label: "Legal", width: 216, height: 356 },
  Letter: { id: "Letter", label: "Letter", width: 216, height: 279 },
  "4x6": { id: "4x6", label: '4 × 6"', width: 102, height: 152, photo: true },
  "5x7": { id: "5x7", label: '5 × 7"', width: 127, height: 178, photo: true },
  "6x8": { id: "6x8", label: '6 × 8"', width: 152, height: 203, photo: true },
  "8x10": { id: "8x10", label: '8 × 10"', width: 203, height: 254, photo: true },
};

/**
 * Photo sizes, in the words a customer uses.
 *
 * 35 × 45 mm is the Indian passport and most government form standard; 25 × 35
 * is the smaller stamp size many applications ask for; 2 × 2 inch is what a US
 * visa wants. Getting these wrong wastes a customer's money and their trip.
 */
export const PHOTO_SIZES = {
  "35x45": { id: "35x45", label: "35 × 45 mm (passport)", width: 35, height: 45 },
  "25x35": { id: "25x35", label: "25 × 35 mm (stamp)", width: 25, height: 35 },
  "2x2in": { id: "2x2in", label: '2 × 2 inch (US visa)', width: 50.8, height: 50.8 },
} as const;

/** A CR80 card — Aadhaar, PAN, voter ID and a driving licence are all this. */
export const ID_CARD = { width: 85.6, height: 53.98 } as const;

export type Rect = { x: Mm; y: Mm; width: Mm; height: Mm };

export type SheetPlan = {
  paper: PaperSize;
  /** Where each item goes, in millimetres from the top-left of the paper. */
  slots: Rect[];
  /** How many of the requested items this sheet holds. */
  perSheet: number;
  /** Sheets needed for the whole order. */
  sheets: number;
  /** True when the item was turned 90° because more fit that way. */
  rotated: boolean;
};

export type GridOptions = {
  /** White edge the printer cannot reach, and nobody wants ink in. */
  margin?: Mm;
  /** Space between items, so scissors have somewhere to go. */
  gutter?: Mm;
  /**
   * Force a number of columns.
   *
   * Used where the arrangement is the point rather than the packing — "side
   * by side" must be one row even though a column of two wastes exactly as
   * little paper.
   */
  columns?: number;
  /**
   * Whether the item may be turned 90° to fit more on the sheet.
   *
   * True is right for photographs — twenty-eight versus thirty is real money
   * to a shop buying paper, and nobody minds which way up a passport photo was
   * laid out before it was cut. It is wrong for an ID card copy: an Aadhaar
   * printed sideways on an A4 is a page an office hands back, and saving one
   * card per sheet is worth nothing to a customer printing one.
   */
  rotate?: boolean;
};

const DEFAULTS = { margin: 5, gutter: 2 } satisfies Pick<GridOptions, "margin" | "gutter">;

/**
 * How many items of one size fit on one sheet, and where each one goes.
 *
 * The item is tried both ways up and the orientation that fits more wins —
 * twenty-eight photos versus thirty is a real difference to a shop buying
 * paper. The block of items is then centred on the sheet, because a grid
 * pushed into one corner looks like a mistake even when the cutting is fine.
 */
export function gridPlan(
  paper: PaperSize,
  item: { width: Mm; height: Mm },
  count: number,
  options: GridOptions = {},
): SheetPlan {
  const { margin, gutter } = { ...DEFAULTS, ...options };

  const upright = capacity(paper, item, margin, gutter);
  const turned = capacity(paper, { width: item.height, height: item.width }, margin, gutter);
  const rotated = options.rotate !== false && turned.total > upright.total;
  const cap = rotated ? turned : upright;
  const size = rotated ? { width: item.height, height: item.width } : item;

  if (cap.total === 0) {
    return { paper, slots: [], perSheet: 0, sheets: 0, rotated };
  }

  const wanted = Math.max(1, Math.floor(count));
  const perSheet = Math.min(wanted, cap.total);
  const grid = options.columns
    ? { cols: Math.min(options.columns, cap.cols), rows: Math.ceil(perSheet / Math.min(options.columns, cap.cols)) }
    : bestGrid(perSheet, cap.cols, cap.rows, paper, size, gutter);

  const blockWidth = grid.cols * size.width + (grid.cols - 1) * gutter;
  const blockHeight = grid.rows * size.height + (grid.rows - 1) * gutter;
  const originX = (paper.width - blockWidth) / 2;
  const originY = (paper.height - blockHeight) / 2;

  const slots: Rect[] = [];
  for (let index = 0; index < perSheet; index += 1) {
    const row = Math.floor(index / grid.cols);
    const column = index % grid.cols;
    slots.push({
      x: originX + column * (size.width + gutter),
      y: originY + row * (size.height + gutter),
      width: size.width,
      height: size.height,
    });
  }

  return { paper, slots, perSheet, sheets: Math.ceil(wanted / cap.total), rotated };
}

function capacity(paper: PaperSize, item: { width: Mm; height: Mm }, margin: Mm, gutter: Mm) {
  const usableWidth = paper.width - margin * 2;
  const usableHeight = paper.height - margin * 2;
  const cols = Math.floor((usableWidth + gutter) / (item.width + gutter));
  const rows = Math.floor((usableHeight + gutter) / (item.height + gutter));
  return { cols: Math.max(0, cols), rows: Math.max(0, rows), total: Math.max(0, cols * rows) };
}

/**
 * The tidiest grid that holds `count`.
 *
 * Twelve photos in one long row of five with three gaps looks like a mistake;
 * a full block looks like a print shop did it. So the grid with the fewest
 * empty slots wins — and among grids that waste nothing, the one whose block
 * is shaped most like the paper, which is what makes the margins even.
 */
function bestGrid(
  count: number,
  maxCols: number,
  maxRows: number,
  paper: PaperSize,
  item: { width: Mm; height: Mm },
  gutter: Mm,
): { cols: number; rows: number } {
  let best = { cols: Math.min(count, maxCols), rows: Math.ceil(count / Math.min(count, maxCols)) };
  let bestWaste = Number.POSITIVE_INFINITY;
  let bestShape = Number.POSITIVE_INFINITY;
  const paperRatio = paper.width / paper.height;

  for (let cols = 1; cols <= maxCols; cols += 1) {
    const rows = Math.ceil(count / cols);
    if (rows > maxRows) continue;

    const waste = cols * rows - count;
    const blockRatio =
      (cols * item.width + (cols - 1) * gutter) / (rows * item.height + (rows - 1) * gutter);
    const shape = Math.abs(blockRatio - paperRatio);

    if (waste < bestWaste || (waste === bestWaste && shape < bestShape)) {
      best = { cols, rows };
      bestWaste = waste;
      bestShape = shape;
    }
  }

  return best;
}

/**
 * An ID card's two sides on one sheet.
 *
 * "Stacked" is what a government office expects — front above back, both the
 * right way up, on one A4 they can file. "Side by side" is for a shop that
 * will guillotine them apart.
 */
export function idCardPlan(
  paper: PaperSize,
  arrangement: "stacked" | "side-by-side" | "actual-size",
  copies = 1,
  /**
   * How many sides the customer actually gave us.
   *
   * Two slots were laid out unconditionally, and a customer who photographed
   * only the front got that front printed twice — because a sheet with more
   * slots than pictures repeats from the start, which is right for twelve
   * passport photos and wrong for an ID. One side means one card.
   */
  sides: 1 | 2 = 2,
  card: { width: Mm; height: Mm } = ID_CARD,
): SheetPlan {
  const count = sides * Math.max(1, copies);

  if (arrangement === "side-by-side") {
    // One row, always: the arrangement is the request. A column of two wastes
    // exactly as little paper, which is how this quietly came out stacked.
    return gridPlan(paper, card, count, { margin: 10, gutter: 6, columns: sides, rotate: false });
  }
  if (arrangement === "actual-size") {
    // Both sides at true card size, packed as tightly as the sheet allows.
    return gridPlan(paper, card, count, { margin: 8, gutter: 4, rotate: false });
  }

  // Stacked: one column, so front sits directly above back.
  const gutter = 10;
  const margin = 15;
  const scale = Math.min(1, (paper.width - margin * 2) / card.width);
  const width = card.width * scale;
  const height = card.height * scale;
  const blockHeight = height * sides + gutter * (sides - 1);
  const top = (paper.height - blockHeight) / 2;

  return {
    paper,
    slots: Array.from({ length: sides }, (_, index) => ({
      x: (paper.width - width) / 2,
      y: top + index * (height + gutter),
      width,
      height,
    })),
    perSheet: sides,
    sheets: Math.max(1, copies),
    rotated: false,
  };
}


/** Millimetres to pixels at a print resolution. 300 DPI is the shop standard. */
export function mmToPx(mm: Mm, dpi = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

/** The pixel canvas one sheet needs at a given resolution. */
export function sheetPixels(paper: PaperSize, dpi = 300): { width: number; height: number } {
  return { width: mmToPx(paper.width, dpi), height: mmToPx(paper.height, dpi) };
}

/**
 * The source rectangle to draw so an image fills a slot without distortion.
 *
 * Everything above decides where on the paper; this decides what part of the
 * photograph. Centre crop, because a passport photo trimmed off-centre is a
 * photo somebody has to pay for twice.
 */
export function coverCrop(
  image: { width: number; height: number },
  slot: { width: Mm; height: Mm },
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  const target = slot.width / slot.height;
  const source = image.width / image.height;

  if (source > target) {
    const sWidth = image.height * target;
    return { sx: (image.width - sWidth) / 2, sy: 0, sWidth, sHeight: image.height };
  }

  const sHeight = image.width / target;
  return { sx: 0, sy: (image.height - sHeight) / 2, sWidth: image.width, sHeight };
}
