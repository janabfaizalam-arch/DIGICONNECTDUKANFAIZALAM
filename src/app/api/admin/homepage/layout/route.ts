import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getHomepageLayout, saveHomepageLayout } from "@/lib/homepage/layout-data";
import { homepageSection, type HomepageSectionState } from "@/lib/homepage/sections";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  return Boolean(user) && isAdminRole(role);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  return NextResponse.json({ data: await getHomepageLayout() });
}

/**
 * Save the arrangement.
 *
 * The body is treated as untrusted: an unknown section id is dropped rather
 * than stored, and a locked section's state is taken from the registry rather
 * than from the request, so no payload can switch the hero off.
 */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const incoming = (body as { sections?: unknown })?.sections;
  if (!Array.isArray(incoming)) {
    return NextResponse.json({ error: "Expected a list of sections." }, { status: 400 });
  }

  const sections: HomepageSectionState[] = [];
  const seen = new Set<string>();

  for (const entry of incoming) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { id?: unknown; enabled?: unknown };
    const id = typeof record.id === "string" ? record.id : "";
    const spec = homepageSection(id);
    if (!spec || seen.has(id)) continue;

    seen.add(id);
    sections.push({
      id: spec.id,
      position: sections.length,
      // A locked band is always on, whatever the browser sent.
      enabled: spec.locked ? true : record.enabled !== false,
    });
  }

  if (!sections.length) {
    return NextResponse.json({ error: "No recognisable sections in the request." }, { status: 400 });
  }

  const saved = await saveHomepageLayout(sections);
  if (!saved) {
    return NextResponse.json(
      { error: "Could not save. The homepage layout table may not exist yet." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, data: sections });
}
