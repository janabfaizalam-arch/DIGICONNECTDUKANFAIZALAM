import { describe, expect, it } from "vitest";

import { galleryCss } from "@/components/portfolio/project-card";
import {
  APPROVED_CLIENT_PROJECTS,
  CAPABILITIES,
  HOMEPAGE_PROJECT_SLUGS,
  PROCESS,
  PROJECT_CATEGORIES,
  PROJECT_KIND_LABEL,
  PROJECTS,
  TECH_STACK,
  projectBySlug,
} from "@/lib/portfolio/content";

describe("portfolio content: authenticity", () => {
  it("never presents a project as client work unless it is approved", () => {
    for (const project of PROJECTS) {
      if (project.kind === "client") {
        expect(APPROVED_CLIENT_PROJECTS).toContain(project.slug);
      }
    }
  });

  it("labels every concept as a concept", () => {
    expect(PROJECT_KIND_LABEL.concept).toBe("Concept Project");
    expect(PROJECT_KIND_LABEL["design-exploration"]).toBe("Design Exploration");
    for (const project of PROJECTS.filter((p) => p.kind !== "client")) {
      expect(["Concept Project", "Design Exploration"]).toContain(PROJECT_KIND_LABEL[project.kind]);
    }
  });

  it("claims no ratings, review counts or client numbers", () => {
    const text = JSON.stringify({ PROJECTS, CAPABILITIES, TECH_STACK, PROCESS });
    expect(text).not.toMatch(/\b\d(\.\d)?\s*(\/\s*5|stars?)\b/i);
    expect(text).not.toMatch(/\b\d+\+?\s*(happy\s+)?(clients|customers|reviews)\b/i);
    expect(text).not.toMatch(/testimonial/i);
  });
});

describe("portfolio content: structure", () => {
  it("has unique slugs that resolve", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(projectBySlug(slug)?.slug).toBe(slug);
    }
  });

  it("puts every project in a known category, and every category has a project", () => {
    const ids = new Set(PROJECT_CATEGORIES.map((c) => c.id));
    for (const project of PROJECTS) expect(ids.has(project.category)).toBe(true);
    for (const category of PROJECT_CATEGORIES) {
      expect(PROJECTS.some((p) => p.category === category.id)).toBe(true);
    }
  });

  it("features four homepage projects that exist", () => {
    expect(HOMEPAGE_PROJECT_SLUGS).toHaveLength(4);
    for (const slug of HOMEPAGE_PROJECT_SLUGS) expect(projectBySlug(slug)).toBeDefined();
  });

  it("covers the seven capabilities and the six process steps", () => {
    expect(CAPABILITIES).toHaveLength(7);
    expect(PROCESS.map((s) => s.title)).toEqual(["Discover", "Strategize", "Design", "Develop", "Launch", "Grow"]);
  });

  it("writes a hide rule for every category filter", () => {
    const css = galleryCss();
    for (const category of PROJECT_CATEGORIES) {
      expect(css).toContain(`.pf-gallery[data-filter="${category.id}"]`);
    }
  });
});
