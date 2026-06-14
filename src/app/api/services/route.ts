// src/app/api/services/route.ts

import { NextResponse } from 'next/server';
import { createServiceConfig, listServices, updateServiceConfig, deleteServiceConfig } from '@/lib/serviceEngineInline';
import type { ServiceConfig } from '@/types/service';

export async function GET() {
  const services = await listServices();
  return NextResponse.json(services);
}
// POST: create a new service (draft)
export async function POST(request: Request) {
  const body = await request.json();
  const result = await createServiceConfig(body as any);
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
