import { NextResponse } from "next/server";

type IndiaPostOffice = {
  Name?: string;
  District?: string;
  State?: string;
  Block?: string;
};

type IndiaPostResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: IndiaPostOffice[] | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pincode = String(searchParams.get("pincode") ?? "").trim();

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ ok: false, message: "A valid 6 digit PIN code is required." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as IndiaPostResponse[];
    const first = result[0];
    const postOffice = first?.PostOffice?.[0];

    if (!response.ok || first?.Status !== "Success" || !postOffice?.State) {
      return NextResponse.json({ ok: false, message: first?.Message ?? "PIN code lookup failed." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      city: postOffice.District || postOffice.Block || postOffice.Name || "",
      state: postOffice.State,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "PIN code lookup failed. Please enter city/state manually." }, { status: 502 });
  }
}
