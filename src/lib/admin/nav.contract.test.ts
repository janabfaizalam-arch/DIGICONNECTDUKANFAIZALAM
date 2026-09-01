import { readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  ADMIN_CHILD_ROUTES,
  ADMIN_WORKSPACES,
  allAdminRoutes,
  flattenAdminNav,
  getAdminWorkspace,
  resolveAdminBreadcrumbs,
  workspaceForPath,
} from "@/lib/admin/nav";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();

/** Every admin screen on disk, as the URL that renders it. */
function adminScreensOnDisk(): string[] {
  const found: string[] = [];

  const walk = (dir: string, url: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (!statSync(path).isDirectory()) {
        if (entry === "page.tsx") found.push(url || "/admin");
        continue;
      }
      // A dynamic segment is a detail view of its parent, never a nav target.
      if (entry.startsWith("[")) continue;
      walk(path, `${url}/${entry}`);
    }
    // The directory's own page.tsx.
    if (readdirSync(dir).includes("page.tsx") && !found.includes(url || "/admin")) {
      found.push(url || "/admin");
    }
  };

  walk(join(root, "src/app/admin"), "/admin");
  return [...new Set(found)];
}

/* ─────────────────────────────────────────────────────────────────────────
   Nothing is unreachable
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Twenty-five admin screens had no link anywhere in the panel. The gallery,
 * the homepage slides, the social links, the branches console, the print desk
 * — all built, all working, all reachable only by typing the URL. This is the
 * test that stops it happening again.
 */
describe("every admin screen has a door", () => {
  it("places each screen in the nav or names it as a child route", () => {
    const known = new Set(allAdminRoutes());
    const orphans = adminScreensOnDisk().filter((route) => !known.has(route));

    expect(
      orphans,
      `These admin screens exist but nothing links to them. Put each in a group in ` +
        `src/lib/admin/nav.ts, or add it to ADMIN_CHILD_ROUTES with the screen it ` +
        `is opened from:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
  });

  it("does not link to a screen that is not there", () => {
    const onDisk = new Set([...adminScreensOnDisk(), "/admin"]);
    const dangling = flattenAdminNav()
      .map((item) => item.href.split("#")[0])
      .filter((href) => !onDisk.has(href));

    expect(dangling, `nav links with no page: ${dangling.join(", ")}`).toEqual([]);
  });

  it("lists a route once, in one workspace", () => {
    const hrefs = flattenAdminNav().map((item) => item.href);
    expect(hrefs.length).toBe(new Set(hrefs).size);
  });

  it("gives every item a description somebody can act on", () => {
    for (const item of flattenAdminNav()) {
      expect(item.description.length, `${item.href} has no description`).toBeGreaterThan(15);
      // A description that just repeats the label teaches nothing.
      expect(item.description.toLowerCase()).not.toBe(item.label.toLowerCase());
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Two workspaces
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Customer work and partner work were interleaved in one sidebar, so finding
 * the applications queue meant reading past commission rules and payout
 * requests.
 */
describe("customer work and partner work are separated", () => {
  it("has exactly the two workspaces, customer first", () => {
    expect(ADMIN_WORKSPACES.map((workspace) => workspace.id)).toEqual(["customer", "partner"]);
  });

  it("keeps every partner and commission screen out of the customer workspace", () => {
    const customer = getAdminWorkspace("customer")
      .groups.flatMap((group) => group.items)
      .map((item) => item.href);

    for (const href of [
      "/admin/agency-partners",
      "/admin/partner-applications",
      "/admin/partner-banners",
      "/admin/commission-rules",
      "/admin/ap-commissions",
      "/admin/ap-payouts",
      "/admin/commissions",
      "/admin/branches",
    ]) {
      expect(customer, `${href} is still in the customer workspace`).not.toContain(href);
    }
  });

  it("keeps the customer business out of the partner workspace", () => {
    const partner = getAdminWorkspace("partner")
      .groups.flatMap((group) => group.items)
      .map((item) => item.href);

    for (const href of ["/admin/customers", "/admin/applications", "/admin/leads", "/admin/services"]) {
      expect(partner, `${href} leaked into the partner workspace`).not.toContain(href);
    }
  });

  it("resolves a path to its own workspace, longest match winning", () => {
    // Everything starts with "/admin", so a naive prefix match sends the whole
    // panel to whichever workspace owns the dashboard.
    expect(workspaceForPath("/admin")).toBe("customer");
    expect(workspaceForPath("/admin/customers/abc")).toBe("customer");
    expect(workspaceForPath("/admin/agency-partners")).toBe("partner");
    expect(workspaceForPath("/admin/ap-payouts")).toBe("partner");
    expect(workspaceForPath("/admin/nothing-here")).toBe("customer");
  });

  it("adds nothing new to the partner side — it is a move, not a build", () => {
    const partner = getAdminWorkspace("partner").groups.flatMap((group) => group.items);
    const onDisk = new Set(adminScreensOnDisk());
    for (const item of partner) {
      expect(onDisk.has(item.href), `${item.href} has no page — the partner side is a move only`).toBe(true);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The website is editable from here
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The homepage slides, the notices, the offer strip, the gallery, the about
 * artwork and the social links were each a working screen with no link. They
 * are one group now, so "change something on the website" is one place.
 */
describe("everything a visitor sees is edited from one group", () => {
  it("gathers the site's content screens under Website", () => {
    const website = getAdminWorkspace("customer").groups.find((group) => group.id === "website");
    expect(website, "the Website group is gone").toBeTruthy();

    const hrefs = website!.items.map((item) => item.href);
    for (const href of [
      "/admin/homepage",
      "/admin/homepage-slides",
      "/admin/homepage-notices",
      "/admin/homepage-offer-strip",
      "/admin/homepage/content",
      "/admin/gallery",
      "/admin/about-page-images",
      "/admin/articles",
      "/admin/social-links",
    ]) {
      expect(hrefs, `${href} is not under Website`).toContain(href);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Breadcrumbs
   ───────────────────────────────────────────────────────────────────────── */

describe("the breadcrumb says where you are", () => {
  it("names the workspace when you are not in the default one", () => {
    const crumbs = resolveAdminBreadcrumbs("/admin/ap-payouts").map((crumb) => crumb.label);
    expect(crumbs[0]).toBe("Admin");
    expect(crumbs).toContain("Partners & Staff");
    expect(crumbs).toContain("Partner Payouts");
  });

  it("shows the list a detail page came from", () => {
    const crumbs = resolveAdminBreadcrumbs("/admin/customers/9fd2").map((crumb) => crumb.label);
    expect(crumbs).toContain("All Customers");
    expect(crumbs[crumbs.length - 1]).toBe("9fd2");
  });

  it("does not repeat the workspace on the dashboard", () => {
    expect(resolveAdminBreadcrumbs("/admin").map((crumb) => crumb.label)).toEqual(["Admin", "Dashboard"]);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The shell
   ───────────────────────────────────────────────────────────────────────── */

describe("the shell renders one workspace at a time", () => {
  const shell = readCode("src/components/admin/admin-shell.tsx");

  it("draws only the active workspace's groups", () => {
    // Rendering both would put the sidebar back the way it was.
    expect(shell).toContain("workspaceForPath");
    // Drawn from the filtered list, so a half-built screen is never offered
    // here as though it worked.
    expect(shell).toContain("navigableGroups(workspace)");
    expect(shell).toContain("groups={groups}");
  });

  it("offers the switch on the phone as well as the desktop", () => {
    const switches = shell.split("AdminWorkspaceSwitch").length - 1;
    expect(switches, "the switch is missing from the drawer or the sidebar").toBeGreaterThanOrEqual(3);
  });

  it("names every child route's parent, so an omission is always deliberate", () => {
    for (const route of ADMIN_CHILD_ROUTES) {
      expect(route.reachedFrom.length, `${route.href} does not say where it is reached from`).toBeGreaterThan(4);
    }
  });
});
