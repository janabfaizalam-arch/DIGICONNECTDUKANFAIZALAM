import { NextRequest } from "next/server";

import { performServerLogout } from "@/lib/auth/logout";

export const dynamic = "force-dynamic";

/** Customer Auth V2 logout — clears JWT + Supabase cookies via canonical logout. */
export async function POST(request: NextRequest) {
  const { response } = await performServerLogout({ request, portal: "customer" });
  return response;
}
