#!/usr/bin/env node
/**
 * API route inventory.
 *
 * Reads every src/app/api/** /route.ts and records, from the source, what each
 * handler does to establish identity, authorise, validate, rate-limit, and
 * whether it can echo an internal error to the caller. Output is a markdown
 * table (docs/compliance/API_ROUTE_INVENTORY.md) plus a list of routes that
 * need a human look.
 *
 * This is a static read, not proof: a guard that lives in a helper the route
 * calls is detected only if the helper's name is in the patterns below. Every
 * route flagged for review was read by hand; see COMPLIANCE_AUDIT.md.
 *
 *   node scripts/security/api-inventory.mjs            # write the markdown
 *   node scripts/security/api-inventory.mjs --json     # print JSON
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, relative, sep } from "path";

const root = process.cwd();
const apiRoot = join(root, "src", "app", "api");

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return entry === "route.ts" ? [full] : [];
  });
}

const has = (source, re) => re.test(source);

const PATTERNS = {
  session: /getCurrentUser\(|auth\.getUser\(|getSession\(|verifyAccessToken|getCustomerSession|resolveCustomerSession|requireAdmin\(|currentUserHasCapability\(/,
  admin: /hasAdminAccess|isAdminRole\(|isAdminUser\(|requireAdmin|verifyAdminAccessToken|getAdminMembership|assertAdmin|requireAdminApi|currentUserHasCapability/,
  partner: /isActiveAgent|getPartnerMembership|getAgencyPartnerByUserId|isAgencyPartnerRole|requirePartner|requireActivePartner|resolvePartnerContext|getAgentAccessStatus/,
  secret: /CRON_SECRET|WEBHOOK_SECRET|secretsEqual|timingSafeEqual|resolveCommsCronSecret|CRM_SYNC_SECRET|x-razorpay-signature|verifyWebhookSignature/,
  station: /authenticateAgent/,
  rateLimit: /checkRateLimit|rateLimit\(|enforceRateLimit|countRecent|MAX_PER_/,
  zod: /\bz\.object|safeParse\(|\.parse\(\s*(body|json|payload|input)/,
  serviceRole: /getSupabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/,
  // An internal error message placed straight into a JSON response.
  errorLeak: /json\(\s*\{[^}]*\b(error|message)\s*:\s*[a-zA-Z_]*[eE]rr(or)?\??\.message/,
  errorLeak2: /jsonError\(\s*[a-zA-Z_]*[eE]rr(or)?\??\.message/,
  // Identity taken from the request instead of the session.
  clientIdentity: /(body|payload|json|input|searchParams)\??\.(get\(\s*["'])?(user_?id|userId|customer_?id|customerId|partner_?id|partnerId|agent_?id|agentId|role)\b/,
  fileUpload: /formData\(\)/,
  fileValidation: /validateFileSignature|allowedMime|ALLOWED_MIME|file\.size\s*>|MAX_FILE|maxFileSize|validateUpload|validateImageFile|upload(Dpr|Itr)Image/,
};

/**
 * Deliberately public surfaces, each read by hand. Listing a route here is a
 * decision with a reason, not a way to silence the scanner.
 */
const REVIEWED_PUBLIC = {
  "auth/admin/login": "sign-in; per-IP limit + per-account PIN lockout",
  "auth/agent-login": "legacy partner sign-in; rate-limited",
  "auth/ap/login": "partner sign-in; per-IP limit + per-account lockout",
  "crm/event": "lead scoring; rate-limited, event allowlist, cannot overwrite names",
  "insurance-quotation/[token]/accept": "unguessable token is the credential; rate-limited",
  lead: "public enquiry form; rate-limited, file type/size checked",
  "partner-applications": "DC Partner sign-up; rate-limited, grants nothing until approved",
  "print/jobs/create": "walk-up print counter; rate-limited, price computed server-side",
  "print/jobs/upload": "walk-up print counter; rate-limited, file validated",
  "print/payment/create-order": "amount read from the stored job, not the client",
  "services/track": "click analytics; rate-limited, bounded, no IP stored",
  "privacy-requests": "privacy request form; rate-limited, stores only what the request needs",
};

const METHOD_RE = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

function classify(route, source) {
  const f = Object.fromEntries(Object.entries(PATTERNS).map(([k, re]) => [k, has(source, re)]));
  const methods = [...source.matchAll(METHOD_RE)].map((m) => m[1]);
  const segment = route.split("/")[0];

  const authn = f.secret
    ? "shared secret / signature"
    : f.station
      ? "print-station token"
      : f.session
        ? "session"
        : "none";
  const authz = f.admin ? "admin" : f.partner ? "partner" : f.session ? "owner/role checks in handler" : authn === "none" ? "public" : "-";

  const flags = [];
  if (authn === "none" && f.serviceRole && methods.some((m) => m !== "GET")) flags.push("unauthenticated service-role write");
  if (segment === "admin" && !f.admin) flags.push("admin route without detected admin guard");
  if (f.errorLeak || f.errorLeak2) flags.push("may return internal error message");
  if (f.clientIdentity) flags.push("reads a user/customer/partner id or role from the request");
  if (f.fileUpload && !f.fileValidation && /file/i.test(source)) flags.push("upload without detected type/size validation");
  if (authn === "none" && methods.some((m) => m !== "GET") && !f.rateLimit) flags.push("public write without rate limit");

  const reviewed = REVIEWED_PUBLIC[route];
  const risk = reviewed
    ? "public (reviewed)"
    : flags.some((x) => /admin route without|unauthenticated service-role write/.test(x))
      ? "review"
      : flags.length
        ? "check"
        : "low";
  if (reviewed) flags.unshift(`reviewed: ${reviewed}`);

  return {
    route: `/api/${route}`,
    methods: methods.join(",") || "-",
    authn,
    authz,
    validation: f.zod ? "zod" : "manual",
    rateLimit: f.rateLimit ? "yes" : "no",
    serviceRole: f.serviceRole ? "yes" : "no",
    flags,
    risk,
  };
}

const rows = walk(apiRoot)
  .map((file) => {
    const route = relative(apiRoot, file).split(sep).slice(0, -1).join("/");
    return classify(route, readFileSync(file, "utf8"));
  })
  .sort((a, b) => a.route.localeCompare(b.route));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const lines = [
    "# API route inventory",
    "",
    "Generated by `node scripts/security/api-inventory.mjs` from the route sources. Static analysis:",
    "`risk=review` and `risk=check` rows were read by hand — outcomes are in COMPLIANCE_AUDIT.md.",
    "",
    `Routes: ${rows.length} · review: ${rows.filter((r) => r.risk === "review").length} · public (reviewed): ${rows.filter((r) => r.risk === "public (reviewed)").length} · check: ${rows.filter((r) => r.risk === "check").length} · low: ${rows.filter((r) => r.risk === "low").length}`,
    "",
    "| Route | Methods | Authentication | Authorization | Validation | Rate limit | Service role | Risk | Notes |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| \`${r.route}\` | ${r.methods} | ${r.authn} | ${r.authz} | ${r.validation} | ${r.rateLimit} | ${r.serviceRole} | ${r.risk} | ${r.flags.join("; ")} |`,
    ),
    "",
  ];
  writeFileSync(join(root, "docs/compliance/API_ROUTE_INVENTORY.md"), lines.join("\n"));
  console.log(`wrote ${rows.length} routes`);
  for (const r of rows.filter((x) => x.risk === "review")) console.log(`${r.risk.padEnd(6)} ${r.route} [${r.methods}] ${r.authn}/${r.authz} :: ${r.flags.join("; ")}`);
}
