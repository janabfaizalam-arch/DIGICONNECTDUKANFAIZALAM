// src/app/admin/service-builder/create/ServiceWizardContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ServiceConfig } from '@/types/service';

export type WizardStep =
  | 'basic'
  | 'form'
  | 'documents'
  | 'workflow'
  | 'pricing'
  | 'commission'
  | 'automation'
  | 'publish';

export interface WizardState {
  step: WizardStep;
  data: Partial<ServiceConfig>;
  draftId?: string;
}

interface WizardContextProps {
  state: WizardState;
  setStep: (step: WizardStep) => void;
  updateData: (partial: Partial<ServiceConfig>) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextProps | undefined>(undefined);

export const useWizard = () => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('WizardContext used outside of provider');
  return ctx;
};

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<WizardState>({
    step: 'basic',
    data: {},
    draftId: undefined,
  });

  const setStep = (step: WizardStep) => setState((s) => ({ ...s, step }));

  const updateData = (partial: Partial<ServiceConfig>) =>
    setState((s) => ({ ...s, data: { ...s.data, ...partial } }));

  const reset = () => setState({ step: 'basic', data: {} });

  return (
    <WizardContext.Provider value={{ state, setStep, updateData, reset }}>
      {children}
    </WizardContext.Provider>
  );
};
