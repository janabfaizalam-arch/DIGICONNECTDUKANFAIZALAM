import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

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

  it("defines five squares and reduced-motion styles", () => {
    const css = read("src/components/ui/digiconnect-loader.module.css");
    expect(css).toContain("square-path");
    expect(css).toContain("2.4s");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("square-pulse");
    expect(css).toContain("--square: 5px");
    expect(css).toContain("--square: 8px");
    expect(css).toContain("--square: 15px");
    expect(css).toContain("--square: 20px");
    expect(css).toContain("var(--primary");
    expect(css).toContain("var(--secondary");
    // five squares rendered in component
    const source = read("src/components/ui/digiconnect-loader.tsx");
    expect((source.match(/styles\.square/g) || []).length).toBe(5);
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
