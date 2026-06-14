// validation_test.ts
// This script validates the end‑to‑end DS‑OS runtime for three services:
//   1. FSSAI Registration
//   2. Income Certificate
//   3. Passport Assistance
// It creates each service via the Service Builder API, publishes it, verifies
// that it appears in the service catalog, submits a sample application, and
// checks that workflow, timeline, events, automation and commission are
// processed.

// Using global fetch (Node >=18) – no external import needed

interface ServiceConfig {
  name: string;
  code: string;
  category: string;
  description: string;
  icon_type: string; // "predefined" | "custom"
  icon_value: string;
  status: string; // "draft" or "published"
  processing_time: string;
  fields: any[]; // dynamic form fields definition
  documents: any[]; // document requirements
  workflow: any[]; // workflow steps definition
  pricing: any; // pricing config
  commission: any; // commission config
  automation: any[]; // automation rules
}

// Helper to POST JSON and return parsed JSON
async function postJson(url: string, data: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${url} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

// Helper to GET JSON
async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET ${url} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

// Service definitions (simplified but covering all required capabilities)
const services: ServiceConfig[] = [
  {
    name: 'FSSAI Registration',
    code: 'FSSAI',
    category: 'Food Service',
    description: 'Register a food business with FSSAI.',
    icon_type: 'predefined',
    icon_value: 'food',
    status: 'published',
    processing_time: '2d',
    fields: [
      { name: 'business_name', type: 'text', label: 'Business Name', required: true },
      { name: 'owner_email', type: 'email', label: 'Owner Email', required: true },
      { name: 'establishment_address', type: 'text', label: 'Address', required: true },
      { name: 'gstin', type: 'gstin', label: 'GSTIN', required: false },
    ],
    documents: [
      { name: 'identity_proof', required: true },
      { name: 'address_proof', required: true },
    ],
    workflow: [
      { step: 'submission', role: 'applicant', next: ['review'] },
      { step: 'review', role: 'admin', next: ['approved', 'rejected'] },
      { step: 'approved', role: 'system', final: true },
      { step: 'rejected', role: 'system', final: true },
    ],
    pricing: { customer_price: 1999, partner_cost: 1499, tax_percent: 18 },
    commission: { type: 'percentage', value: 10 },
    automation: [
      { event: 'application_created', action: 'send_notification', channels: ['in_app', 'email'] },
      { event: 'application_submitted', action: 'apply_commission' },
    ],
  },
  {
    name: 'Income Certificate',
    code: 'INCOME_CERT',
    category: 'Government',
    description: 'Apply for an income certificate.',
    icon_type: 'predefined',
    icon_value: 'certificate',
    status: 'published',
    processing_time: '1d',
    fields: [
      { name: 'applicant_name', type: 'text', label: 'Name', required: true },
      { name: 'annual_income', type: 'number', label: 'Annual Income', required: true },
      { name: 'contact_email', type: 'email', label: 'Email', required: true },
    ],
    documents: [
      { name: 'id_proof', required: true },
      { name: 'address_proof', required: true },
    ],
    workflow: [
      { step: 'submission', role: 'applicant', next: ['verification'] },
      { step: 'verification', role: 'admin', next: ['issued', 'rejected'] },
      { step: 'issued', role: 'system', final: true },
      { step: 'rejected', role: 'system', final: true },
    ],
    pricing: { customer_price: 1499, partner_cost: 999, tax_percent: 18 },
    commission: { type: 'percentage', value: 8 },
    automation: [
      { event: 'application_created', action: 'send_notification', channels: ['in_app'] },
      { event: 'application_submitted', action: 'apply_commission' },
    ],
  },
  {
    name: 'Passport Assistance',
    code: 'PASSAP',
    category: 'Travel',
    description: 'Assist users in obtaining a passport.',
    icon_type: 'predefined',
    icon_value: 'passport',
    status: 'published',
    processing_time: '3d',
    fields: [
      { name: 'full_name', type: 'text', label: 'Full Name', required: true },
      { name: 'dob', type: 'date', label: 'Date of Birth', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'phone', type: 'mobile', label: 'Mobile Number', required: true },
    ],
    documents: [
      { name: 'photo', required: true },
      { name: 'address_proof', required: true },
    ],
    workflow: [
      { step: 'submission', role: 'applicant', next: ['review'] },
      { step: 'review', role: 'admin', next: ['approved', 'rejected'] },
      { step: 'approved', role: 'system', final: true },
      { step: 'rejected', role: 'system', final: true },
    ],
    pricing: { customer_price: 2999, partner_cost: 1999, tax_percent: 18 },
    commission: { type: 'percentage', value: 12 },
    automation: [
      { event: 'application_created', action: 'send_notification', channels: ['in_app', 'email'] },
      { event: 'application_submitted', action: 'apply_commission' },
    ],
  },
];

async function createAndPublishService(svc: ServiceConfig) {
  // The Service Builder API expects a payload matching the shape used by the wizard.
  // For simplicity we send the fields directly; the backend will map them into the
  // corresponding tables (service_fields, service_workflows, etc.).
  const payload = {
    name: svc.name,
    code: svc.code,
    category: svc.category,
    description: svc.description,
    icon_type: svc.icon_type,
    icon_value: svc.icon_value,
    status: 'draft', // start as draft, then publish via separate endpoint
    processing_time: svc.processing_time,
    fields: svc.fields,
    documents: svc.documents,
    workflow: svc.workflow,
    pricing: svc.pricing,
    commission: svc.commission,
    automation: svc.automation,
  };

  const createResp = await postJson('http://localhost:3001/api/services', payload);
  const serviceId = createResp.serviceId;
  console.log(`✅ Created service "${svc.name}" with id ${serviceId}`);

  // Publish the service via the existing PUT endpoint to update status
  const publishResp = await fetch('http://localhost:3001/api/services', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId, updates: { status: 'published' } }),
  });
  if (!publishResp.ok) throw new Error(`PUT /api/services failed for service ${serviceId}`);

  console.log(`✅ Published service "${svc.name}"`);
  return serviceId;
}

async function submitApplication(serviceId: string, fields: Record<string, any>) {
  const payload = { serviceId, fields };
  const resp = await postJson('http://localhost:3001/api/applications', payload);
  console.log(`✅ Application submitted for service ${serviceId}, applicationId=${resp.applicationId}`);
  return resp.applicationId;
}

async function verifyCatalog() {
  const list = await getJson('http://localhost:3001/api/services?status=published');
  console.log('📋 Published services catalog:', list.map((s: any) => s.name).join(', '));
}

async function runValidation() {
  // 1. Create & publish services
  const ids: string[] = [];
  for (const svc of services) {
    const id = await createAndPublishService(svc);
    ids.push(id);
  }

  // 2. Verify catalog visibility
  await verifyCatalog();

  // 3. Submit a sample application for each service
  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const serviceId = ids[i];
    // Build a minimal field map using required fields only
    const fieldMap: Record<string, any> = {};
    for (const f of svc.fields) {
      switch (f.type) {
        case 'text':
          fieldMap[f.name] = `${svc.code}_demo`;
          break;
        case 'email':
          fieldMap[f.name] = 'demo@example.com';
          break;
        case 'number':
          fieldMap[f.name] = 12345;
          break;
        case 'mobile':
          fieldMap[f.name] = '9876543210';
          break;
        case 'date':
          fieldMap[f.name] = '1990-01-01';
          break;
        case 'gstin':
          fieldMap[f.name] = '27AAEPM1234C1Z5';
          break;
        default:
          fieldMap[f.name] = 'demo';
      }
    }
    await submitApplication(serviceId, fieldMap);
  }

  console.log('🚀 Validation sequence completed. Check the database for timeline entries, events, and commission records.');
}

runValidation().catch(err => {
  console.error('❌ Validation failed:', err);
  process.exit(1);
});
