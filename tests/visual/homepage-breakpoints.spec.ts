import { test, expect } from "@playwright/test";
import path from "path";

const widths = [320, 390, 768, 1440, 1920] as const;

test.describe("Homepage visual breakpoints", () => {
  for (const width of widths) {
    test(`captures homepage at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width <= 768 ? 844 : 1024 });
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(1500);

      // Structural checks for correction audit
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.getByText(/Hidden when empty|Empty \/ Hidden|CMS-driven/i)).toHaveCount(0);

      const outDir = path.join(process.cwd(), "tests", "visual", "output");
      await page.screenshot({
        path: path.join(outDir, `homepage-${width}.png`),
        fullPage: true,
      });

      // No horizontal overflow at mobile widths
      if (width <= 430) {
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(2);
      }
    });
  }
});
