import { NextRequest } from "next/server";

import { performServerLogout } from "@/lib/auth/logout";

export const dynamic = "force-dynamic";

/** @deprecated Prefer POST /api/auth/logout — kept as a thin alias. */
export async function POST(request: NextRequest) {
  const { response } = await performServerLogout({ request, portal: "customer" });
  return response;
}
