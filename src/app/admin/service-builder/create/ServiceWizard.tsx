"use client";

// src/app/admin/service-builder/create/ServiceWizard.tsx

import React from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { BasicInfoStep } from '@/app/admin/service-builder/create/steps/BasicInfoStep';
import { FormBuilderStep } from '@/app/admin/service-builder/create/steps/FormBuilderStep';
import { WorkflowBuilderStep } from '@/app/admin/service-builder/create/steps/WorkflowBuilderStep';
import { PricingStep } from '@/app/admin/service-builder/create/steps/PricingStep';
import { CommissionStep } from '@/app/admin/service-builder/create/steps/CommissionStep';
import { AutomationStep } from '@/app/admin/service-builder/create/steps/AutomationStep';
import { PublishStep } from '@/app/admin/service-builder/create/steps/PublishStep';

export const ServiceWizard = () => {
  const { state, setStep } = useWizard();

  const renderStep = () => {
    switch (state.step) {
      case 'basic':
        return <BasicInfoStep onNext={() => setStep('form')} />;
      case 'form':
        return <FormBuilderStep onNext={() => setStep('workflow')} onBack={() => setStep('basic')} />;
      case 'workflow':
        return <WorkflowBuilderStep onNext={() => setStep('pricing')} onBack={() => setStep('form')} />;
      case 'pricing':
        return <PricingStep onNext={() => setStep('commission')} onBack={() => setStep('workflow')} />;
      case 'commission':
        return <CommissionStep onNext={() => setStep('automation')} onBack={() => setStep('pricing')} />;
      case 'automation':
        return <AutomationStep onNext={() => setStep('publish')} onBack={() => setStep('commission')} />;
      case 'publish':
        return <PublishStep onBack={() => setStep('automation')} />;
      default:
        return null;
    }
  };

  return <div className="wizard-container max-w-4xl mx-auto p-4 bg-white rounded shadow-lg">{renderStep()}</div>;
};
