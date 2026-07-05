import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";
import { getSupabaseUrl } from "@/lib/supabase/config";
import { signAccessToken, signRefreshToken } from "./jwt";
import { setAuthCookies, getDeviceId, generateNewDeviceId } from "./cookies";

// Creates a supabase client using the service role key to bypass RLS for auth operations
export function getAuthSupabase() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase configuration for authentication.");
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() { return []; },
      setAll() { return; }
    }
  });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(customerId: string, mobile: string, userAgent: string, ipAddress: string) {
  const supabase = getAuthSupabase();
  let deviceId = await getDeviceId();

  // 1. Manage Device
  let deviceRecordId: string;
  if (!deviceId) {
    deviceId = await generateNewDeviceId();
    const { data: newDevice, error: deviceError } = await supabase
      .from("customer_devices")
      .insert({
        customer_id: customerId,
        device_identifier: deviceId,
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .select("id")
      .single();

    if (deviceError || !newDevice) throw new Error("Failed to register device.");
    deviceRecordId = newDevice.id;
  } else {
    // Upsert or fetch existing device
    const { data: existingDevice } = await supabase
      .from("customer_devices")
      .select("id")
      .eq("device_identifier", deviceId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (existingDevice) {
      deviceRecordId = existingDevice.id;
      // Update last active
      await supabase.from("customer_devices").update({ last_active: new Date().toISOString(), ip_address: ipAddress, user_agent: userAgent }).eq("id", deviceRecordId);
    } else {
      const { data: newDevice, error: deviceError } = await supabase
        .from("customer_devices")
        .insert({
          customer_id: customerId,
          device_identifier: deviceId,
          user_agent: userAgent,
          ip_address: ipAddress,
        })
        .select("id")
        .single();
      if (deviceError || !newDevice) throw new Error("Failed to register device.");
      deviceRecordId = newDevice.id;
    }
  }

  // 2. Generate Tokens
  const payload = { sub: customerId, mobile, role: "customer" as const, device_id: deviceRecordId };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  const refreshTokenHash = hashToken(refreshToken);

  // 3. Save Session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const { error: sessionError } = await supabase
    .from("customer_sessions")
    .insert({
      customer_id: customerId,
      device_id: deviceRecordId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (sessionError) throw new Error("Failed to create session.");

  // 4. Set Cookies
  await setAuthCookies(accessToken, refreshToken, deviceId);

  return { accessToken, refreshToken };
}

export async function revokeSession(refreshToken: string | null) {
  if (!refreshToken) return;
  const hash = hashToken(refreshToken);
  const supabase = getAuthSupabase();
  await supabase
    .from("customer_sessions")
    .update({ is_revoked: true })
    .eq("refresh_token_hash", hash);
}

export async function rotateSession(oldRefreshToken: string, userAgent: string, ipAddress: string) {
  const hash = hashToken(oldRefreshToken);
  const supabase = getAuthSupabase();

  // 1. Fetch session
  const { data: session, error } = await supabase
    .from("customer_sessions")
    .select("id, customer_id, device_id, is_revoked, expires_at, customers!inner(mobile, is_active)")
    .eq("refresh_token_hash", hash)
    .single();

  if (error || !session) throw new Error("Invalid session.");

  // If session is revoked or expired, or customer inactive, deny refresh
  if (session.is_revoked || new Date(session.expires_at) < new Date() || !(session.customers as unknown as { mobile: string; is_active: boolean }).is_active) {
    throw new Error("Session invalid or expired.");
  }

  // 2. Revoke old session (Rotation)
  await supabase
    .from("customer_sessions")
    .update({ is_revoked: true })
    .eq("id", session.id);

  // 3. Issue new tokens
  const payload = { sub: session.customer_id, mobile: (session.customers as unknown as { mobile: string; is_active: boolean }).mobile, role: "customer" as const, device_id: session.device_id };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // 4. Save new session
  await supabase
    .from("customer_sessions")
    .insert({
      customer_id: session.customer_id,
      device_id: session.device_id,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt.toISOString(),
    });

  // Update device activity
  await supabase
    .from("customer_devices")
    .update({ last_active: new Date().toISOString(), ip_address: ipAddress, user_agent: userAgent })
    .eq("id", session.device_id);

  const deviceId = await getDeviceId();
  
  // 5. Update cookies
  await setAuthCookies(accessToken, refreshToken, deviceId || "unknown");

  return { accessToken, refreshToken };
}
