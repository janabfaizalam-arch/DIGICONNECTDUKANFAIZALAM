/**
 * Row-level security and storage policies, tested against a real PostgreSQL.
 *
 * Every migration in supabase/migrations is replayed, in order, on top of a
 * minimal Supabase stub (supabase/tests/supabase-stub.sql), then each scenario
 * runs as the `anon` or `authenticated` role with real JWT claims — the same
 * way PostgREST and Supabase Storage evaluate policies. A download through the
 * Storage API is authorised by a SELECT on storage.objects, a listing is the
 * same SELECT over a prefix, and upload / overwrite / delete are INSERT /
 * UPDATE / DELETE, so these queries are what the API would be allowed to do.
 *
 * Needs a PostgreSQL 15+ server and `psql` on PATH:
 *   RLS_TEST_DATABASE_URL=postgresql://postgres@localhost:5432/postgres npm run test:rls
 * Skipped (not passed) when RLS_TEST_DATABASE_URL is unset.
 */

import { execFileSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const adminUrl = process.env.RLS_TEST_DATABASE_URL;
const root = process.cwd();
const dbName = `rls_test_${process.pid}_${Date.now()}`;

const A = "11111111-1111-4111-8111-111111111111"; // customer A
const B = "22222222-2222-4222-8222-222222222222"; // customer B
const ADMIN = "33333333-3333-4333-8333-333333333333";
const PARTNER = "44444444-4444-4444-8444-444444444444";

function dbUrl(name: string) {
  const url = new URL(adminUrl!);
  url.pathname = `/${name}`;
  return url.toString();
}

function psql(url: string, sql: string, opts: { stopOnError?: boolean } = {}) {
  const args = [url, "-X", "-q", "-At", "-v", `ON_ERROR_STOP=${opts.stopOnError === false ? 0 : 1}`, "-f", "-"];
  return execFileSync("psql", args, { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

type Actor = { role: "anon" } | { role: "authenticated"; sub: string; userMetadata?: Record<string, unknown> };

/** Run `sql` as a Supabase API caller, inside a transaction that is rolled back. */
function as(actor: Actor, sql: string): { ok: true; out: string } | { ok: false; error: string } {
  const claims =
    actor.role === "anon"
      ? { role: "anon" }
      : { role: "authenticated", sub: actor.sub, user_metadata: actor.userMetadata ?? {} };
  const script = `
begin;
set local "request.jwt.claims" = '${JSON.stringify(claims).replace(/'/g, "''")}';
set local role ${actor.role};
${sql};
rollback;
`;
  try {
    return { ok: true, out: psql(dbUrl(dbName), script).split("\n").filter(Boolean).pop() ?? "" };
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? String(error);
    return { ok: false, error: stderr };
  }
}

const count = (actor: Actor, where: string) => {
  const result = as(actor, `select count(*) from storage.objects where ${where}`);
  if (!result.ok) throw new Error(result.error);
  return Number(result.out);
};

describe.skipIf(!adminUrl)("RLS and storage policies (real PostgreSQL)", () => {
  beforeAll(() => {
    psql(adminUrl!, `create database ${dbName};`);
    const url = dbUrl(dbName);
    psql(url, readFileText("supabase/tests/supabase-stub.sql"));

    // Replay history statement by statement. A handful of historical
    // statements reference objects created outside migrations; they fail here
    // exactly as they would on any fresh project, and everything after them
    // still applies.
    const migrations = readdirSync(join(root, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of migrations) {
      try {
        psql(url, readFileText(`supabase/migrations/${file}`), { stopOnError: false });
      } catch {
        // psql exits non-zero on any failed statement even with ON_ERROR_STOP=0.
      }
    }

    psql(
      url,
      `
insert into auth.users (id, email, raw_app_meta_data) values
  ('${A}', 'a@example.test', '{}'), ('${B}', 'b@example.test', '{}'),
  ('${ADMIN}', 'admin@example.test', '{"role":"admin"}'), ('${PARTNER}', 'p@example.test', '{"role":"agency_partner"}');
insert into public.profiles (id, email, role) values
  ('${A}', 'a@example.test', 'customer'), ('${B}', 'b@example.test', 'customer'),
  ('${ADMIN}', 'admin@example.test', 'admin'), ('${PARTNER}', 'p@example.test', 'agent')
  on conflict (id) do update set role = excluded.role;
update public.profiles set failed_login_attempts = 5, locked_until = now() + interval '1 hour' where id = '${A}';
insert into public.users (id, email, role) values
  ('${A}', 'a@example.test', 'customer'), ('${B}', 'b@example.test', 'customer')
  on conflict (id) do update set role = excluded.role;
insert into storage.objects (bucket_id, name) values
  ('documents', '${A}/aadhaar.pdf'), ('documents', '${B}/pan.pdf'),
  ('documents', 'public-leads/lead.pdf'), ('documents', 'final-documents/${A}/cert.pdf'),
  ('application-documents', '${A}/app/photo.jpg'),
  ('ap-kyc-documents', '${PARTNER}/pan.pdf'),
  ('credit-reports', '${A}/report.pdf'), ('credit-reports', '${B}/report.pdf'),
  ('print-jobs', 'job-1/file.pdf');
`,
    );
  }, 180_000);

  afterAll(() => {
    try {
      psql(adminUrl!, `drop database if exists ${dbName} with (force);`);
    } catch {
      // best effort
    }
  });

  const anon: Actor = { role: "anon" };
  const customerA: Actor = { role: "authenticated", sub: A };
  const admin: Actor = { role: "authenticated", sub: ADMIN };
  const partner: Actor = { role: "authenticated", sub: PARTNER };

  describe("private buckets", () => {
    it("every bucket holding personal data is private", () => {
      const result = as(
        { role: "authenticated", sub: ADMIN },
        `select string_agg(id, ',' order by id) from storage.buckets where public and id in
         ('documents','application-documents','application-final-documents','kyc-documents','ap-kyc-documents','credit-reports','print-jobs')`,
      );
      // storage.buckets is not readable through RLS here; check as the owner instead.
      const owner = psql(
        dbUrl(dbName),
        `select coalesce(string_agg(id, ','), '') from storage.buckets where public and id in
         ('documents','application-documents','application-final-documents','kyc-documents','ap-kyc-documents','credit-reports','print-jobs')`,
      );
      expect(owner).toBe("");
      expect(result.ok).toBe(true);
    });
  });

  describe("anonymous visitor", () => {
    it("cannot list any customer document", () => {
      expect(count(anon, "bucket_id = 'documents'")).toBe(0);
    });
    it("cannot download a document by guessing its path", () => {
      expect(count(anon, `bucket_id = 'documents' and name = '${A}/aadhaar.pdf'`)).toBe(0);
    });
    it("cannot read any private bucket", () => {
      expect(
        count(
          anon,
          "bucket_id in ('application-documents','application-final-documents','ap-kyc-documents','credit-reports','print-jobs','kyc-documents')",
        ),
      ).toBe(0);
    });
    it("cannot upload into the documents bucket", () => {
      const result = as(anon, "insert into storage.objects (bucket_id, name) values ('documents', 'public-leads/x.pdf')");
      expect(result.ok).toBe(false);
    });
  });

  describe("customer A", () => {
    it("cannot list customer B's folder", () => {
      expect(count(customerA, `bucket_id = 'documents' and name like '${B}/%'`)).toBe(0);
    });
    it("cannot download customer B's document", () => {
      expect(count(customerA, `bucket_id = 'documents' and name = '${B}/pan.pdf'`)).toBe(0);
    });
    it("cannot overwrite customer B's document", () => {
      const result = as(customerA, `update storage.objects set name = name where bucket_id = 'documents' and name = '${B}/pan.pdf' returning id`);
      expect(result.ok && result.out).toBeFalsy();
    });
    it("cannot delete customer B's document", () => {
      const result = as(customerA, `delete from storage.objects where bucket_id = 'documents' returning id`);
      expect(result.ok && result.out).toBeFalsy();
    });
    it("cannot upload directly into the documents bucket, even into their own folder", () => {
      const result = as(customerA, `insert into storage.objects (bucket_id, name) values ('documents', '${A}/x.pdf')`);
      expect(result.ok).toBe(false);
    });
    it("cannot read partner KYC documents", () => {
      expect(count(customerA, "bucket_id = 'ap-kyc-documents'")).toBe(0);
    });
    it("can read only their own credit report", () => {
      expect(count(customerA, `bucket_id = 'credit-reports' and name = '${A}/report.pdf'`)).toBe(1);
      expect(count(customerA, `bucket_id = 'credit-reports' and name = '${B}/report.pdf'`)).toBe(0);
    });
  });

  describe("partner and admin", () => {
    it("a partner reads only their own KYC folder", () => {
      expect(count(partner, "bucket_id = 'ap-kyc-documents'")).toBe(1);
    });
    it("an admin (by database role) reads partner KYC", () => {
      expect(count(admin, "bucket_id = 'ap-kyc-documents'")).toBe(1);
    });
    it("the service role (server routes) can read every document", () => {
      const out = psql(
        dbUrl(dbName),
        "begin; set local role service_role; select count(*) from storage.objects where bucket_id = 'documents'; rollback;",
      )
        .split("\n")
        .filter(Boolean)
        .pop();
      expect(Number(out)).toBe(4);
    });
  });

  describe("privilege escalation", () => {
    it("user_metadata cannot make a customer an admin", () => {
      // A signed-up account whose profile row does not exist yet: the case in
      // which current_app_role() used to fall through to user_metadata.
      const noProfile = "55555555-5555-4555-8555-555555555555";
      const forged: Actor = { role: "authenticated", sub: noProfile, userMetadata: { role: "admin" } };
      expect(as(forged, "select public.is_admin_role()")).toEqual({ ok: true, out: "f" });
      const forgedWithProfile: Actor = { role: "authenticated", sub: A, userMetadata: { role: "admin" } };
      expect(as(forgedWithProfile, "select public.is_admin_role()")).toEqual({ ok: true, out: "f" });
    });
    it("a customer cannot set their own profile role", () => {
      const result = as(customerA, `update public.profiles set role = 'admin' where id = '${A}'`);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toMatch(/can only be changed by an administrator/);
    });
    it("a customer cannot clear their own KYC or lockout state", () => {
      expect(as(customerA, `update public.profiles set kyc_status = 'approved' where id = '${A}'`).ok).toBe(false);
      expect(as(customerA, `update public.profiles set failed_login_attempts = 0, locked_until = null where id = '${A}'`).ok).toBe(false);
    });
    it("a customer cannot set their role in public.users", () => {
      expect(as(customerA, `update public.users set role = 'admin' where id = '${A}'`).ok).toBe(false);
    });
    it("a customer still edits their own ordinary profile fields", () => {
      const result = as(customerA, `update public.profiles set full_name = 'New Name', city = 'Orai' where id = '${A}' returning full_name`);
      expect(result).toEqual({ ok: true, out: "New Name" });
    });
    it("a customer cannot edit another customer's profile", () => {
      const result = as(customerA, `update public.profiles set full_name = 'x' where id = '${B}' returning id`);
      expect(result.ok && result.out).toBeFalsy();
    });
    it("an admin can still change roles", () => {
      const result = as(admin, `update public.profiles set role = 'agent' where id = '${B}' returning role`);
      expect(result).toEqual({ ok: true, out: "agent" });
    });
  });
});

function readFileText(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}
