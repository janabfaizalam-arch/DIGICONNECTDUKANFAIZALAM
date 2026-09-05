import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PHOTO_SLOTS } from "@/lib/labour/photos";

/**
 * The slot list is a contract with whoever adds the photographs: the file
 * names in the README and the ones the page looks for have to be the same, or
 * a correctly sourced image sits in the folder doing nothing.
 */
describe("photo slots", () => {
  const readme = readFileSync("public/images/services/labour-card/README.md", "utf8");

  it("names every slot in the README", () => {
    for (const slot of PHOTO_SLOTS) {
      expect(readme, `${slot.file} is not in the README`).toContain(slot.file);
    }
  });

  it("gives every slot alt text and a caption", () => {
    for (const slot of PHOTO_SLOTS) {
      expect(slot.alt.trim().length, `${slot.file} has no usable alt text`).toBeGreaterThan(12);
      expect(slot.caption.trim().length, `${slot.file} has no caption`).toBeGreaterThan(3);
      expect(slot.category.trim().length, `${slot.file} has no category`).toBeGreaterThan(2);
    }
  });

  it("covers every section that asked for a photograph", () => {
    // Thirteen slots were specified; a slot silently dropped is a section
    // that quietly goes back to having no photograph available to it.
    expect(PHOTO_SLOTS).toHaveLength(13);
  });

  it("asks for WebP at a sane size", () => {
    for (const slot of PHOTO_SLOTS) {
      expect(slot.file.endsWith(".webp")).toBe(true);
      expect(slot.width).toBeLessThanOrEqual(1600);
      expect(slot.height).toBeLessThanOrEqual(1200);
    }
  });

  it("has no duplicate ids or file names", () => {
    expect(new Set(PHOTO_SLOTS.map((slot) => slot.id)).size).toBe(PHOTO_SLOTS.length);
    expect(new Set(PHOTO_SLOTS.map((slot) => slot.file)).size).toBe(PHOTO_SLOTS.length);
  });
});
