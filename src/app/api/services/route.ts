// src/app/api/services/route.ts

import { NextResponse } from 'next/server';
import { getCurrentUser, hasAdminAccess } from '@/lib/auth';
import { createServiceConfig, listServices, updateServiceConfig, deleteServiceConfig } from '@/lib/serviceEngineInline';
import type { ServiceConfig } from '@/types/service';

/**
 * Service catalogue engine.
 *
 * GET lists published services and stays public. Every write is admin-only:
 * these handlers use the service-role client, and they used to accept any
 * caller — so anyone could PUT a new price onto a service (which checkout
 * then charged), rename it, or DELETE it.
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  if (!(await hasAdminAccess(user))) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  return null;
}

/** Columns an admin may change through PUT. Anything else in `updates` is ignored. */
const UPDATABLE = new Set([
  'title', 'slug', 'category', 'description', 'short_description', 'status', 'icon',
  'base_customer_fee', 'customer_fee', 'amount', 'government_fee', 'processing_time',
  'is_featured', 'sort_order',
]);

function pickUpdatable(updates: unknown) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return null;
  const picked = Object.fromEntries(Object.entries(updates as Record<string, unknown>).filter(([key]) => UPDATABLE.has(key)));
  return Object.keys(picked).length ? picked : null;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET() {
  const services = await listServices();
  return NextResponse.json(services);
}

// POST: create a new service (draft)
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !(body as ServiceConfig).service) {
    return NextResponse.json({ error: 'Invalid service configuration.' }, { status: 400 });
  }
  const result = await createServiceConfig(body as ServiceConfig);
  if (!result.success) {
    console.error('[api/services] create_failed', result.error);
    return NextResponse.json({ error: 'Service could not be created.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, serviceId: result.serviceId });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { serviceId?: unknown; updates?: unknown } | null;
  const updates = pickUpdatable(body?.updates);
  if (!validId(body?.serviceId) || !updates) {
    return NextResponse.json({ error: 'A service id and at least one editable field are required.' }, { status: 400 });
  }
  const result = await updateServiceConfig(body.serviceId, updates as Partial<ServiceConfig['service']>);
  if (!result.success) {
    console.error('[api/services] update_failed', result.error);
    return NextResponse.json({ error: 'Service could not be updated.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { serviceId?: unknown } | null;
  if (!validId(body?.serviceId)) {
    return NextResponse.json({ error: 'A valid service id is required.' }, { status: 400 });
  }
  const result = await deleteServiceConfig(body.serviceId);
  if (!result.success) {
    console.error('[api/services] delete_failed', result.error);
    return NextResponse.json({ error: 'Service could not be deleted.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
