import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const recent = read("src/app/api/recent-applications/route.ts");
assert(!/generateFallbacks|fallbackApplications/i.test(recent), "recent-apps still has fake padding");
assert(recent.includes('["completed", "delivered"]'), "recent-apps status filter missing");

const google = read("src/components/homepage/google-reviews.tsx");
assert(!google.includes("fallbackReviews"), "google reviews still has fallbackReviews");
assert(
  /if\s*\(.*!reviewsList\.length.*\)\s*return null/.test(google) || google.includes("if (!reviewsList.length) return null"),
  "google reviews must hide when empty",
);

const video = read("src/components/homepage/video-testimonials.tsx");
assert(video.includes("return null"), "video testimonials must return null");
assert(!video.includes("mixkit"), "video testimonials must not use mixkit stock");

const knowledge = read("src/components/homepage/knowledge-center.tsx");
assert(!knowledge.includes("fallbackArticles"), "knowledge still has fallbackArticles");
assert(knowledge.includes("if (!display.length) return null"), "knowledge must hide when empty");

const page = read("src/app/page.tsx");
assert(page.includes("HomepageHero"), "homepage hero missing");
assert(page.includes("getPublicServices"), "public services missing");
assert(page.includes("getActiveHomepageSlides"), "homepage slides fetch missing");
assert(page.includes("catalog={searchCatalog}"), "search catalog missing");
assert(!/20% Wallet Cashback on every service/.test(page), "unsupported cashback claim in metadata");

const layout = read("src/app/layout.tsx");
assert(layout.includes("HomepageOfferNoticeBar"), "announcement must mount in layout header stack");

const notices = read("src/lib/homepage-notices.ts");
assert(!/return getDefaultHomepageNotices\(\);/.test(notices), "active notices must not invent default production promotions");

console.log("homepage no-fake-data contracts: ALL PASS");
