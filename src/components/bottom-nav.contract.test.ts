import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { describe, expect, it } from "vitest";

import { CUSTOMER_SECTIONS } from "@/lib/customer/sections";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** The file with its comments taken out, so a docblock can never satisfy — or
 *  break — an assertion about the code. */
const code = readCode;

const nav = code("src/components/bottom-nav.tsx");
const shell = code("src/components/customer/portal-shell.tsx");

describe("the app's bottom tab bar", () => {
  /**
   * The reported bug, and the one most likely to come back: a signed-in
   * customer tapped Home and was sent to the dashboard instead of the
   * website, so from inside the portal there was no way out at all.
   */
  it("sends Home to the website's home page, for every kind of visitor", () => {
    expect(nav).toMatch(/HOME_ITEM[^;]*href: "\/"/s);

    // And nothing re-points it per role.
    for (const list of ["CUSTOMER_TABS", "ADMIN_TABS", "PARTNER_TABS", "GUEST_TABS"]) {
      const body = nav.slice(nav.indexOf(`const ${list}`), nav.indexOf("];", nav.indexOf(`const ${list}`)));
      expect(body, `${list} should start from HOME_ITEM`).toContain("HOME_ITEM");
      expect(body, `${list} must not define its own home`).not.toMatch(/id: "home"/);
    }
  });

  /**
   * `/customer/dashboard` is `force-dynamic`. A `Link` to `?tab=…` therefore
   * re-runs the server component and re-reads the profile, applications,
   * wallet and documents from Supabase before the screen changes — which is
   * exactly the delay a customer feels on every tab press. While already on
   * the dashboard the bar has to switch in place instead.
   */
  it("switches sections in place instead of navigating, while on the dashboard", () => {
    expect(nav).toContain("requestSection");
    expect(nav).toMatch(/onDashboard = pathname === "\/customer\/dashboard"/);
    // Every section the bar carries switches in place rather than linking.
    for (const section of ["home", "wallet", "help"]) {
      expect(nav, `no tab for ${section}`).toContain(`section: "${section}"`);
    }
  });

  /**
   * Five tabs cannot hold five sections plus a website exit plus Apply, so
   * two sections are reached from elsewhere. This is the test that stops
   * "elsewhere" from quietly becoming "nowhere" — which is how the Secure
   * Vault ended up being a screen nobody could find.
   */
  it("leaves every section reachable, from the bar or from the chrome", () => {
    const header = code("src/components/site-header.tsx");
    const shell = code("src/components/customer/portal-shell.tsx");

    const fromBar = new Set([...nav.matchAll(/section: "([a-z]+)"/g)].map((match) => match[1]));
    // The desktop sidebar renders NAV, which lists the sections by id.
    const fromSidebar = new Set(
      [...shell.matchAll(/\{ id: "([a-z]+)", label:/g)].map((match) => match[1]),
    );
    // The header's person button opens the account section.
    const fromHeader = new Set<string>();
    if (/sectionHref\("account"\)/.test(header)) fromHeader.add("account");
    // Home lists the applications and links to them.
    const fromHome = new Set(
      [...code("src/components/customer/section-home.tsx").matchAll(/onNavigate\("([a-z]+)"\)/g)].map(
        (match) => match[1],
      ),
    );

    for (const section of CUSTOMER_SECTIONS) {
      const reachable =
        fromBar.has(section) || fromSidebar.has(section) || fromHeader.has(section) || fromHome.has(section);
      expect(reachable, `${section} is unreachable from anywhere`).toBe(true);
    }
  });

  it("has no More sheet left to hide sections in", () => {
    expect(nav).not.toContain("MoreSheet");
    expect(nav).not.toContain("CUSTOMER_MORE");
  });

  /**
   * The portal used to print its own rail of section pills above the content,
   * saying the same thing as the bar below it. One navigation per screen.
   */
  it("is the portal's only section navigation on a phone", () => {
    // NAV is rendered exactly once, by the desktop sidebar. A second render
    // is the phone rail coming back.
    expect([...shell.matchAll(/NAV\.map/g)]).toHaveLength(1);
    expect(shell).not.toContain("Section rail");
  });

  /**
   * This component is mounted by the root layout, so it is on every page. As
   * long as it imports the full `motion` build, no amount of converting the
   * other components can take the site off it — which is the only reason this
   * is worth pinning. It is not a size win on its own: thirty other files
   * still import `motion` directly, and every route measured byte-identical
   * when this one was converted.
   */
  it("uses the lazy motion bundle rather than the full one", () => {
    expect(nav).toContain("LazyMotion");
    expect(nav).toContain("domAnimation");
    expect(nav).not.toMatch(/\bmotion\.[a-z]/);
  });
});

describe("the customer document vault", () => {
  it("has no API left", () => {
    expect(existsSync(resolve(root, "src/app/api/customer/vault"))).toBe(false);
  });

  it("is read by nothing in the app", () => {
    const form = code("src/components/portal/service-application-form.tsx");
    expect(form).not.toContain("/api/customer/vault");
    expect(form).not.toContain("vault_ocr_jobs");
    expect(form).not.toContain("handleOcrAutofill");
  });

  it("has its tables dropped by a migration", () => {
    const sql = read("supabase/migrations/20260828090000_drop_customer_document_vault.sql");
    expect(sql).toMatch(/DROP TABLE IF EXISTS public\.customer_vault_documents/);
    expect(sql).toMatch(/DROP TABLE IF EXISTS public\.vault_ocr_jobs/);
    // Supabase blocks a direct DELETE against storage.objects
    // (storage.protect_delete raises 42501), so the migration must not try —
    // it failed outright when it did, and took the table drops down with it.
    expect(sql).not.toMatch(/DELETE FROM storage\.objects/);
  });

  it("has its stored files removed by a script that only touches its own prefix", () => {
    const script = read("scripts/delete-vault-storage-files.mjs");
    expect(script).toMatch(/const BUCKET = "application-documents"/);
    expect(script).toMatch(/const PREFIX = "vault-documents\/"/);
    // The bucket is shared with per-application uploads, which must survive,
    // so nothing outside the vault's prefix may be passed to remove().
    expect(script).toMatch(/filter\(\(path\) => path\.startsWith\(PREFIX\)\)/);
    // Deleting is opt-in; a bare run reports what it would do.
    expect(script).toMatch(/--confirm/);
    // storage.list pages at 100, so a single call would silently miss most of
    // a large vault and the script would claim success.
    expect(script).toMatch(/offset/);
  });
});
