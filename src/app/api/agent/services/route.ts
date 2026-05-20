import { NextResponse } from "next/server";

import { getVisibleAgentServices } from "@/lib/agent-services";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !(await isActiveAgent(user))) {
    return NextResponse.json({ message: "Agent access required." }, { status: 403 });
  }

  const services = await getVisibleAgentServices(user.id);

  return NextResponse.json({ services });
}
