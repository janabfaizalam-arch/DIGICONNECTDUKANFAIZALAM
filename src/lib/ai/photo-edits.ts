/**
 * What a customer may ask the AI to do, and what to call it on screen.
 *
 * Deliberately free of any import from `gemini.ts`: that module is
 * `server-only`, and the customer's page needs these names and labels. Only
 * the identifiers and the words live here — the instructions the model is
 * actually given, and the key used to send them, stay on the server.
 *
 * The list is closed on purpose. An open prompt travelling from a browser to
 * an image model on this platform's key is somebody else's image generator,
 * paid for by this shop.
 */

export type PhotoEditId = "auto_fix" | "background_white" | "background_blue" | "formal_clothing";

export type PhotoEdit = {
  id: PhotoEditId;
  label: string;
  /** One line the customer reads, in their words. */
  blurb: string;
};

export const PHOTO_EDITS: PhotoEdit[] = [
  {
    id: "auto_fix",
    label: "Auto fix",
    blurb: "Seedha, sahi framing, plain background, achhi roshni",
  },
  { id: "background_white", label: "Safed background", blurb: "Sirf background badlega" },
  { id: "background_blue", label: "Neela background", blurb: "Sirf background badlega" },
  {
    id: "formal_clothing",
    label: "Formal kapde",
    blurb: "Sirf kapde — chehra bilkul waisa hi rahega",
  },
];

const IDS = new Set<string>(PHOTO_EDITS.map((edit) => edit.id));

export function isPhotoEdit(value: unknown): value is PhotoEditId {
  return typeof value === "string" && IDS.has(value);
}

export function photoEdit(id: PhotoEditId): PhotoEdit | null {
  return PHOTO_EDITS.find((edit) => edit.id === id) ?? null;
}
