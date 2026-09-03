import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import {
  classifySource,
  dailyVisitorHash,
  deviceFromUserAgent,
  isBotUserAgent,
  isSelfReferral,
  isTrackablePath,
  normalisePath,
  referrerHost,
} from "@/lib/analytics/visit";
import { summariseVisits, type VisitRow } from "@/lib/analytics/summarise";

/* ─────────────────────────────────────────────────────────────────────────
   Nothing personal is kept
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The whole reason this can live in our own database rather than Google's is
 * that it holds nothing about the person. Every rule below is load-bearing:
 * lose one and this becomes a table of who-read-what, attached to a name.
 */
describe("a visit says what, never who", () => {
  const route = readCode("src/app/api/track/route.ts");
  const tracker = readCode("src/components/analytics/visit-tracker.tsx");
  const migration = readCode("supabase/migrations/20260903140000_site_visits.sql");

  it("never stores the IP it was given", () => {
    expect(route).not.toMatch(/ip:\s*ip/);
    expect(migration).not.toMatch(/\bip\b\s+(text|inet)/i);
  });

  it("turns the IP into a hash that changes every day", () => {
    const monday = dailyVisitorHash({ ip: "1.2.3.4", userAgent: "ua", day: "2026-09-01", salt: "s" });
    const tuesday = dailyVisitorHash({ ip: "1.2.3.4", userAgent: "ua", day: "2026-09-02", salt: "s" });
    const other = dailyVisitorHash({ ip: "9.9.9.9", userAgent: "ua", day: "2026-09-01", salt: "s" });

    expect(monday).toBe(dailyVisitorHash({ ip: "1.2.3.4", userAgent: "ua", day: "2026-09-01", salt: "s" }));
    expect(monday).not.toBe(tuesday);
    expect(monday).not.toBe(other);
    expect(monday).toHaveLength(32);
    expect(monday).not.toContain("1.2.3.4");
  });

  it("sets no cookie and reads nothing that outlives the tab", () => {
    expect(tracker).not.toContain("document.cookie");
    expect(tracker).not.toContain("localStorage");
    expect(tracker).toContain("sessionStorage");
  });

  it("drops the query string, which is where the tokens are", () => {
    expect(normalisePath("/apply?token=abc123&mobile=9876543210")).toBe("/apply");
    expect(normalisePath("https://rnos.in/p/K24Y5F?x=1#top")).toBe("/p/K24Y5F");
    expect(normalisePath("/services/")).toBe("/services");
    expect(normalisePath("")).toBeNull();
  });

  it("takes the town from the CDN rather than from the page", () => {
    // A browser can claim anything; the edge header it cannot forge.
    expect(route).toContain("x-vercel-ip-city");
    expect(route).toContain("x-vercel-ip-country-region");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The numbers have to be worth trusting
   ───────────────────────────────────────────────────────────────────────── */

describe("what counts as a visit", () => {
  it("does not count crawlers, previews or uptime checks", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "facebookexternalhit/1.1",
      "curl/8.4.0",
      "Vercel-Screenshot/1.0",
      "",
    ]) {
      expect(isBotUserAgent(ua), `${ua || "(empty)"} was counted as a person`).toBe(true);
    }

    expect(
      isBotUserAgent("Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"),
    ).toBe(false);
  });

  it("does not count the machinery", () => {
    expect(isTrackablePath("/api/track")).toBe(false);
    expect(isTrackablePath("/_next/static/chunk.js")).toBe(false);
    expect(isTrackablePath("/favicon.ico")).toBe(false);
    expect(isTrackablePath("/services/pan-card")).toBe(true);
  });

  it("knows a phone from a computer", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148")).toBe("phone");
    expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 13; SM-A536E) Mobile Safari")).toBe("phone");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });

  it("names the sources this shop actually gets", () => {
    expect(classifySource("https://www.google.com/search?q=pan+card")).toBe("google");
    expect(classifySource("https://l.facebook.com/l.php")).toBe("facebook");
    expect(classifySource("https://www.instagram.com/")).toBe("instagram");
    expect(classifySource(null)).toBe("direct");
    expect(classifySource("https://some-blog.in/post")).toBe("other");
    // A WhatsApp forward is most of this shop's traffic, and it arrives with
    // its own referrer or a utm tag depending on the phone.
    expect(classifySource("https://api.whatsapp.com/")).toBe("whatsapp");
    expect(classifySource(null, "whatsapp")).toBe("whatsapp");
  });

  it("does not call a second page a new arrival", () => {
    expect(isSelfReferral("https://www.rnos.in/services", "rnos.in")).toBe(true);
    expect(isSelfReferral("https://rnos.in/", "www.rnos.in")).toBe(true);
    expect(isSelfReferral("https://google.com/", "rnos.in")).toBe(false);
    expect(referrerHost("not a url")).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Counting
   ───────────────────────────────────────────────────────────────────────── */

const NOW = new Date("2026-09-03T12:00:00Z");

function row(overrides: Partial<VisitRow> = {}): VisitRow {
  return {
    occurred_at: "2026-09-03T11:00:00Z",
    visit_day: "2026-09-03",
    visitor_hash: "v1",
    session_id: "s1",
    path: "/",
    page_title: "Home",
    source: "direct",
    city: "Orai",
    region: "UP",
    device: "phone",
    is_entry: true,
    ...overrides,
  };
}

describe("summarising a day's traffic", () => {
  it("counts a person once however many pages they open", () => {
    const summary = summariseVisits(
      [
        row({ path: "/" }),
        row({ path: "/services", is_entry: false }),
        row({ path: "/services/pan-card", is_entry: false }),
      ],
      NOW,
    );

    expect(summary.today.views).toBe(3);
    expect(summary.today.visitors).toBe(1);
    expect(summary.pagesPerVisit).toBe(3);
  });

  it("counts two people as two", () => {
    const summary = summariseVisits(
      [row({ visitor_hash: "a", session_id: "sa" }), row({ visitor_hash: "b", session_id: "sb" })],
      NOW,
    );
    expect(summary.today.visitors).toBe(2);
  });

  it("counts the source once per visit, not once per page", () => {
    // Otherwise a person who reads eight pages makes WhatsApp look like eight
    // arrivals, and the one who bounced looks like nobody.
    const summary = summariseVisits(
      [
        row({ source: "whatsapp", is_entry: true }),
        row({ source: "whatsapp", is_entry: false, path: "/a" }),
        row({ source: "whatsapp", is_entry: false, path: "/b" }),
        row({ visitor_hash: "b", session_id: "sb", source: "google", is_entry: true }),
      ],
      NOW,
    );

    // One arrival each. Equal counts settle alphabetically so the panel does
    // not reshuffle itself between two identical loads.
    expect(summary.sources).toEqual([
      { key: "google", label: "Google", count: 1 },
      { key: "whatsapp", label: "WhatsApp", count: 1 },
    ]);
  });

  it("keeps the days nobody came", () => {
    const summary = summariseVisits([row()], NOW);
    expect(summary.days).toHaveLength(14);
    expect(summary.days[13]).toMatchObject({ day: "2026-09-03", visitors: 1 });
    expect(summary.days[0]).toMatchObject({ day: "2026-08-21", visitors: 0, views: 0 });
  });

  it("counts only the last half hour as 'now'", () => {
    const summary = summariseVisits(
      [
        row({ occurred_at: "2026-09-03T11:50:00Z", visitor_hash: "recent" }),
        row({ occurred_at: "2026-09-03T09:00:00Z", visitor_hash: "earlier" }),
      ],
      NOW,
    );
    expect(summary.now).toBe(1);
  });

  it("ranks pages and towns by how often they appear", () => {
    const summary = summariseVisits(
      [
        row({ path: "/services", city: "Orai", region: "UP" }),
        row({ path: "/services", city: "Orai", region: "UP", visitor_hash: "b", session_id: "sb" }),
        row({ path: "/", city: "Kanpur", region: "UP", visitor_hash: "c", session_id: "sc" }),
      ],
      NOW,
    );

    expect(summary.pages[0]).toMatchObject({ key: "/services", count: 2 });
    expect(summary.cities[0]).toMatchObject({ key: "Orai, UP", count: 2 });
  });

  it("says nothing rather than something wrong when there is no data", () => {
    const summary = summariseVisits([], NOW);
    expect(summary.today).toEqual({ views: 0, visitors: 0 });
    expect(summary.pagesPerVisit).toBe(0);
    expect(summary.days).toHaveLength(14);
    expect(summary.sources).toEqual([]);
  });
});
