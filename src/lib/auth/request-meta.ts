import { NextRequest } from "next/server";

export function getClientIp(request: Request | NextRequest): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getUserAgent(request: Request | NextRequest): string {
  return request.headers.get("user-agent")?.slice(0, 500) || "unknown";
}
