// src/lib/serviceEngineInline.ts
// Inline service engine functions to avoid import/export parsing issues.
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { emitEvent } from '@/lib/eventBus';
import type { ServiceConfig } from '@/types/service';

/** Create a new service configuration (draft). */
export async function createServiceConfig(config: Omit<ServiceConfig, 'service'> & { service: Omit<ServiceConfig['service'], 'id'> }): Promise<{ success: boolean; serviceId?: string; error?: unknown }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .insert({
      slug: config.service.slug,
      name: config.service.name,
      description: config.service.description,
      base_customer_fee: config.service.base_customer_fee,
      tat_hours: config.service.tat_hours,
      status: config.service.status ?? 'draft',
      category: config.service.category,
      processing_time_hours: config.service.processing_time_hours,
      icon_type: config.service.icon_type,
      icon_value: config.service.icon_value,
      metadata: config.service.metadata,
    })
    .select('id')
    .single();
  if (serviceError) {
    console.error('[serviceEngine] Service insert error', serviceError);
    return { success: false, error: serviceError };
  }
  const serviceId = serviceData?.id as string;
  await emitEvent('service_created', { serviceId });

  // Insert optional sections
  if (config.documents?.length) {
    const docPayload = config.documents.map(d => ({ service_id: serviceId, name: d.name, required: d.required, reusable: d.reusable }));
    await supabase.from('service_documents').insert(docPayload);
  }
  if (config.pricing) {
    await supabase.from('service_pricing').insert({ service_id: serviceId, ...config.pricing });
  }
  if (config.commission) {
    await supabase.from('service_commission').insert({ service_id: serviceId, ...config.commission });
  }
  if (config.automation?.length) {
    const autoPayload = config.automation.map(a => ({ service_id: serviceId, event: a.event, actions: a.actions }));
    await supabase.from('service_automation').insert(autoPayload);
  }
  // Fields
  if (config.fields?.length) {
    const fieldsPayload = config.fields.map(f => ({
      service_id: serviceId,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      sort_order: f.sort_order,
      validation_chains: f.validation_chains,
      default_value: f.default_value,
    }));
    await supabase.from('service_fields').insert(fieldsPayload);
  }
  // Workflows
  if (config.workflows?.length) {
    const workflowsPayload = config.workflows.map(w => ({
      service_id: serviceId,
      step_key: w.step_key,
      label: w.label,
      sort_order: w.sort_order,
      allowed_transitions: w.allowed_transitions,
    }));
    await supabase.from('service_workflows').insert(workflowsPayload);
  }
  return { success: true, serviceId };
}

/** List published services */
import { servicesData } from '@/lib/services-data';

export async function listServices(): Promise<ServiceConfig['service'][]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return servicesData.map(s => ({
      id: s.slug,
      title: s.title,
      slug: s.slug,
      category: s.category,
      status: 'published',
      customer_fee: s.amount,
      processing_time: '2-3 Days',
    } as any));
  }
  const { data, error } = await supabase.from('services').select('*').eq('status', 'published');
  if (error) {
    console.error('[serviceEngine] listServices error', error);
    return [];
  }
  if (!data || data.length === 0) {
    return servicesData.map(s => ({
      id: s.slug,
      title: s.title,
      slug: s.slug,
      category: s.category,
      status: 'published',
      customer_fee: s.amount,
      processing_time: '2-3 Days',
    } as any));
  }
  return (data as unknown) as ServiceConfig['service'][];
}

/** Update a service */
export async function updateServiceConfig(serviceId: string, updates: Partial<ServiceConfig['service']>): Promise<{ success: boolean; error?: unknown }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  const { error } = await supabase.from('services').update(updates).eq('id', serviceId);
  if (error) {
    console.error('[serviceEngine] Service update error', error);
    return { success: false, error };
  }
  return { success: true };
}

/** Delete a service and its related data */
export async function deleteServiceConfig(serviceId: string): Promise<{ success: boolean; error?: unknown }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'Supabase not initialized' };
  await supabase.from('service_fields').delete().eq('service_id', serviceId);
  await supabase.from('service_workflows').delete().eq('service_id', serviceId);
  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  if (error) {
    console.error('[serviceEngine] Service delete error', error);
    return { success: false, error };
  }
  return { success: true };
}
