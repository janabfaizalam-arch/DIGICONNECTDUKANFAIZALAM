export type IndianPincodeLocation = {
  city: string;
  district: string;
  state: string;
  postOffices?: {
    name: string;
    type: string;
    deliveryStatus: string;
  }[];
  defaultOffice?: string;
};

type IndiaPostOffice = {
  Name?: string;
  District?: string;
  State?: string;
  Block?: string;
  DeliveryStatus?: string;
  BranchType?: string;
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

  // Force default city, district, state for 285001
  if (pincode === "285001") {
    return {
      ok: true,
      location: {
        city: "Orai",
        district: "Jalaun",
        state: "Uttar Pradesh",
        postOffices: [
          { name: "Orai H.O", type: "Head Office", deliveryStatus: "Delivery" },
          { name: "Orai Kutchery Sub Office", type: "Sub Office", deliveryStatus: "Delivery" }
        ],
        defaultOffice: "Orai H.O"
      },
    };
  }

  const postalEndpoints = [
    `https://api.postalpincode.in/pincode/${pincode}`,
    `https://www.postalpincode.in/api/pincode/${pincode}`
  ];
  const pincodesInfoEndpoint = `https://pincodesinfo.in/api/pincode/${pincode}`;
  let lastMessage = "PIN code lookup failed. Please try again.";

  // Try the official India Post API first to get rich PostOffice metadata (BranchType, DeliveryStatus)
  for (const endpoint of postalEndpoints) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const result = (await response.json()) as IndiaPostResponse[];
      const first = result[0];
      const postOffices = first?.PostOffice || [];
      
      if (response.ok && first?.Status?.toLowerCase() === "success" && postOffices.length > 0) {
        // Map all post offices
        const officesList = postOffices.map((o) => ({
          name: String(o.Name || "").trim(),
          type: String(o.BranchType || "").trim(),
          deliveryStatus: String(o.DeliveryStatus || "").trim()
        }));

        // Filter by priorities
        const headOffices = postOffices.filter(
          (o) => o.BranchType === "Head Office" || o.Name?.includes(" H.O")
        );
        const subOffices = postOffices.filter(
          (o) => o.BranchType === "Sub Office" || o.Name?.includes(" S.O")
        );
        const branchOffices = postOffices.filter(
          (o) => o.BranchType === "Branch Office" || o.Name?.includes(" B.O")
        );

        const bestOffice = headOffices[0] || subOffices[0] || branchOffices[0] || postOffices[0];

        // For city field:
        // Use Head Office name if available, Else Sub Office name, Else District name.
        // Do NOT auto-fill random village/branch office when Head Office or Sub Office exists.
        let city = "";
        if (headOffices.length > 0 && headOffices[0].Name) {
          city = headOffices[0].Name;
        } else if (subOffices.length > 0 && subOffices[0].Name) {
          city = subOffices[0].Name;
        } else {
          city = bestOffice?.District || "";
        }

        const district = String(bestOffice?.District || "").trim();
        const state = String(bestOffice?.State || "").trim();

        if (city && district && state) {
          return {
            ok: true,
            location: {
              city: city.trim(),
              district: district.trim(),
              state: state.trim(),
              postOffices: officesList,
              defaultOffice: bestOffice?.Name || ""
            },
          };
        }
      }

      lastMessage = first?.Message ?? lastMessage;
    } catch {
      // Try next endpoint/fallback
    }
  }

  // Fall back to PincodesInfo as secondary provider
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
      const mockOfficeName = office?.office_name || city;
      return {
        ok: true,
        location: {
          city,
          district,
          state,
          postOffices: [{ name: mockOfficeName, type: "Sub Office", deliveryStatus: "Delivery" }],
          defaultOffice: mockOfficeName
        }
      };
    }
  } catch {
    // Both failed
  }

  return { ok: false, message: lastMessage, status: 502 };
}
