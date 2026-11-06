import { NextResponse } from "next/server";

import { UPLOAD_MAX_BYTES } from "@/lib/balance-sheets/autofill";
import { requireAdmin } from "@/lib/balance-sheets/admin-api";
import { ExtractError, extractFromUpload, type ExtractFailure } from "@/lib/balance-sheets/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** What the admin is told for each failure. Never the upstream error itself. */
const MESSAGES: Record<ExtractFailure, string> = {
  too_large: "File 4 MB se badi hai. Chhoti PDF ya sirf zaroori pages upload karein.",
  unsupported: "Ye file type nahi padh sakte. PDF, JSON, TXT ya photo (JPG/PNG) upload karein.",
  needs_password: "Ye PDF password se band hai. Password bharein (AIS/26AS mein PAN chhote akshar + janam tithi DDMMYYYY).",
  wrong_password: "Password galat hai. Dobara check karein.",
  unreadable: "Ye PDF padhi nahi ja saki. Dusri copy ya photo upload karein.",
  empty: "File khaali hai.",
  not_configured: "AI is server par set nahi hai. Figures haath se bharein.",
  bad_key: "AI ki key kaam nahi kar rahi. Admin se kahein ki Gemini key check karein.",
  rate_limited: "AI abhi bahut busy hai. Ek minute baad dobara koshish karein.",
  model_unavailable: "AI model abhi uplabdh nahi hai. Thodi der baad koshish karein.",
  timeout: "Document padhne mein zyada samay lag gaya. Chhoti file ke saath dobara koshish karein.",
  blocked: "AI ne ye document padhne se mana kar diya.",
  no_image: "AI se jawab nahi mila. Dobara koshish karein.",
  upstream: "AI se sahi jawab nahi mila. Dobara koshish karein.",
};

const STATUS: Partial<Record<ExtractFailure, number>> = {
  too_large: 413,
  unsupported: 415,
  needs_password: 422,
  wrong_password: 422,
  unreadable: 422,
  empty: 422,
  rate_limited: 429,
  not_configured: 503,
};

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: MESSAGES.unsupported, failure: "unsupported" }, { status: 400 });
  }
  const file = form.get("file");
  const password = String(form.get("password") ?? "").trim().slice(0, 64);
  if (!(file instanceof File)) return NextResponse.json({ message: "File nahi mili.", failure: "empty" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ message: MESSAGES.empty, failure: "empty" }, { status: 422 });
  if (file.size > UPLOAD_MAX_BYTES) return NextResponse.json({ message: MESSAGES.too_large, failure: "too_large" }, { status: 413 });

  try {
    const result = await extractFromUpload(
      { name: file.name.slice(0, 160), type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) },
      password || undefined,
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    const failure: ExtractFailure = caught instanceof ExtractError ? caught.failure : "upstream";
    return NextResponse.json({ message: MESSAGES[failure], failure }, { status: STATUS[failure] ?? 502 });
  }
}
