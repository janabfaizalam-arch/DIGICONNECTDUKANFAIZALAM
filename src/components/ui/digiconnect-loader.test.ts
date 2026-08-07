import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// __dirname is src/components/ui — three levels up is the repo root the
// relative paths below are written against.
const ROOT = path.resolve(__dirname, "../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("DigiConnectLoader contracts", () => {
  it("supports required variants and sizes", () => {
    const source = read("src/components/ui/digiconnect-loader.tsx");
    expect(source).toContain('variant?: "inline" | "section" | "fullscreen"');
    expect(source).toContain('size?: "xs" | "sm" | "md" | "lg"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-busy="true"');
    expect(source).toContain("srOnly");
  });

  it("defines the converging connect animation and reduced-motion styles", () => {
    const css = read("src/components/ui/digiconnect-loader.module.css");
    expect(css).toContain("node-converge-left");
    expect(css).toContain("node-converge-right");
    expect(css).toContain("link-draw");
    expect(css).toContain("1.8s");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("node-breathe");
    expect(css).toContain("--node: 6px");
    expect(css).toContain("--node: 8px");
    expect(css).toContain("--node: 12px");
    expect(css).toContain("--node: 16px");
    // Brand colors drive both nodes — blue converging on orange.
    expect(css).toContain("var(--primary");
    expect(css).toContain("var(--secondary");
  });

  it("renders exactly two nodes joined by one link", () => {
    const source = read("src/components/ui/digiconnect-loader.tsx");
    expect((source.match(/styles\.node\b/g) || []).length).toBe(2);
    expect((source.match(/styles\.nodeLeft/g) || []).length).toBe(1);
    expect((source.match(/styles\.nodeRight/g) || []).length).toBe(1);
    expect((source.match(/styles\.link/g) || []).length).toBe(1);
  });

  it("keeps the fullscreen overlay card-free so the mark is the hero", () => {
    const css = read("src/components/ui/digiconnect-loader.module.css");
    const fullscreenInner = css.slice(
      css.indexOf(".fullscreenInner {"),
      css.indexOf("@keyframes shell-fade-in"),
    );
    expect(fullscreenInner).not.toMatch(/border:/);
    expect(fullscreenInner).not.toMatch(/box-shadow:/);
    expect(fullscreenInner).not.toMatch(/background:/);
  });

  it("root loading uses fullscreen DigiConnectLoader", () => {
    const source = read("src/app/loading.tsx");
    expect(source).toContain("DigiConnectLoader");
    expect(source).toContain('variant="fullscreen"');
    expect(source).toContain("Loading DigiConnect Dukan");
  });

  it("Button supports isLoading without breaking existing API", () => {
    const source = read("src/components/ui/button.tsx");
    expect(source).toContain("isLoading?");
    expect(source).toContain("loadingText?");
    expect(source).toContain("DigiConnectLoader");
    expect(source).toContain("aria-busy");
    expect(source).toContain("preventDefault");
  });

  it("FormSubmitButton remains compatible with loading prop", () => {
    const source = read("src/components/ui/loading.tsx");
    expect(source).toContain("loading?");
    expect(source).toContain("isLoading");
    expect(source).toContain("DigiConnectLoader");
  });

  it("retains partner detail skeleton loading route", () => {
    const source = read("src/app/admin/agency-partners/[id]/loading.tsx");
    expect(source).toContain("animate-pulse");
    expect(source).not.toContain("DigiConnectLoader");
  });
});
