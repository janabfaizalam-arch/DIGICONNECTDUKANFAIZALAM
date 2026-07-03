// src/app/api/services/route.ts

import { NextResponse } from 'next/server';
import { createServiceConfig, listServices, updateServiceConfig, deleteServiceConfig } from '@/lib/serviceEngineInline';
import type { ServiceConfig } from '@/types/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debugVal = searchParams.get("debug");
  if (debugVal) {
    console.log("=== WIZARD DEBUG INFO ===", debugVal);
    return NextResponse.json({ ok: true });
  }
  const services = await listServices();
  return NextResponse.json(services);
}
// POST: create a new service (draft)
export async function POST(request: Request) {
  const body = await request.json();
  const result = await createServiceConfig(body as ServiceConfig);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, serviceId: result.serviceId });
}

export async function PUT(request: Request) {
  const { serviceId, updates } = (await request.json()) as { serviceId: string; updates: Partial<ServiceConfig['service']> };
  const result = await updateServiceConfig(serviceId, updates);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { serviceId } = (await request.json()) as { serviceId: string };
  const result = await deleteServiceConfig(serviceId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
