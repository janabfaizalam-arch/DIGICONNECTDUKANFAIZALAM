export type IndianPincodeLocation = {
  city: string;
  district: string;
  state: string;
};

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

type PincodesInfoResult = {
  office_name?: string;
  taluk?: string | null;
  district?: string;
  state?: string;
};

type PincodesInfoResponse = {
  success?: boolean;
  results?: PincodesInfoResult[];
};

export type IndianPincodeLookupResult =
  | { ok: true; location: IndianPincodeLocation }
  | { ok: false; message: string; status: number };

export async function lookupIndianPincode(pincode: string): Promise<IndianPincodeLookupResult> {
  if (!/^\d{6}$/.test(pincode)) {
    return { ok: false, message: "A valid 6 digit PIN code is required.", status: 400 };
  }

  const pincodesInfoEndpoint = `https://pincodesinfo.in/api/pincode/${pincode}`;
  const postalEndpoints = [`https://api.postalpincode.in/pincode/${pincode}`, `https://www.postalpincode.in/api/pincode/${pincode}`];
  let lastMessage = "PIN code lookup failed. Please try again.";

  try {
    const response = await fetch(pincodesInfoEndpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const result = (await response.json()) as PincodesInfoResponse;
    const office = result.results?.find((item) => item.district && item.state) ?? result.results?.[0];
    const city = String(office?.taluk || office?.office_name || office?.district || "").trim();
    const district = String(office?.district || "").trim();
    const state = String(office?.state || "").trim();

    if (response.ok && result.success && city && district && state) {
      return { ok: true, location: { city, district, state } };
    }
  } catch {
    // Fall back to the India Post shaped providers below.
  }

  for (const endpoint of postalEndpoints) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const result = (await response.json()) as IndiaPostResponse[];
      const first = result[0];
      const postOffice = first?.PostOffice?.find((office) => office?.District && office?.State) ?? first?.PostOffice?.[0];
      const city = String(postOffice?.Name || postOffice?.Block || postOffice?.District || "").trim();
      const district = String(postOffice?.District || "").trim();
      const state = String(postOffice?.State || "").trim();

      if (response.ok && first?.Status?.toLowerCase() === "success" && city && district && state) {
        return {
          ok: true,
          location: { city, district, state },
        };
      }

      lastMessage = first?.Message ?? lastMessage;
    } catch {
      // Try the next endpoint before surfacing a lookup failure.
    }
  }

  return { ok: false, message: lastMessage, status: 502 };
}
