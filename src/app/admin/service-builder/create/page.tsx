// src/app/admin/service-builder/create/page.tsx

import React from 'react';
import { WizardProvider } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { ServiceWizard } from '@/app/admin/service-builder/create/ServiceWizard';

export default function CreateServicePage() {
  return (
    <section style={{ padding: '2rem', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>Create New Service</h1>
      <WizardProvider>
        <ServiceWizard />
      </WizardProvider>
    </section>
  );
}
