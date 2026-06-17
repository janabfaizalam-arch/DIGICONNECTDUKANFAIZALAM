"use client";

// src/app/admin/service-builder/create/steps/WorkflowBuilderStep.tsx

import React, { useState } from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { ServiceWorkflow } from '@/types/service';

/**
 * Step 3 – Workflow Builder
 * Allows admins to define an ordered list of workflow steps and allowed transitions.
 * Simple UI: add step, edit label/key, reorder up/down, and specify allowed transitions via multiselect.
 */
export const WorkflowBuilderStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { state, updateData } = useWizard();
  const [steps, setSteps] = useState<ServiceWorkflow[]>(state.data.workflows || []);

  const addStep = () => {
    const newStep: ServiceWorkflow = {
      id: crypto.randomUUID(),
      service_id: '',
      step_key: `step_${steps.length + 1}`,
      label: `Step ${steps.length + 1}`,
      sort_order: steps.length,
      allowed_transitions: [],
    };
    setSteps([...steps, newStep]);
  };

  const deleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    const updated = [...steps];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setSteps(updated.map((s, i) => ({ ...s, sort_order: i })));
  };

  const updateStep = (index: number, partial: Partial<ServiceWorkflow>) => {
    const updated = steps.map((s, i) => (i === index ? { ...s, ...partial } : s));
    setSteps(updated);
  };

  const handleNext = () => {
    updateData({ workflows: steps });
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Workflow Builder</h2>
      <button type="button" onClick={addStep} className="primary-btn mb-4">
        + Add Step
      </button>
      <ul className="space-y-4">
        {steps.map((step, idx) => (
          <li key={step.id} className="p-4 border rounded bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <strong>{step.label}</strong>
              <div className="space-x-2">
                <button type="button" onClick={() => deleteStep(idx)} className="small-btn text-red-600">
                  Delete
                </button>
                <button type="button" onClick={() => moveStep(idx, idx - 1)} disabled={idx === 0} className="small-btn">
                  ↑
                </button>
                <button type="button" onClick={() => moveStep(idx, idx + 1)} disabled={idx === steps.length - 1} className="small-btn">
                  ↓
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                Label
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(idx, { label: e.target.value })}
                />
              </label>
              <label>
                Key
                <input
                  type="text"
                  value={step.step_key}
                  onChange={(e) => updateStep(idx, { step_key: e.target.value })}
                />
              </label>
              <label className="col-span-2">
                Allowed Transitions (comma separated step keys)
                <input
                  type="text"
                  value={step.allowed_transitions.join(',')}
                  onChange={(e) =>
                    updateStep(idx, { allowed_transitions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                  }
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      <div className="navigation-buttons mt-6">
        <button type="button" onClick={onBack} className="secondary-btn mr-2">
          ← Back
        </button>
        <button type="button" onClick={handleNext} className="primary-btn">
          Next →
        </button>
      </div>
    </div>
  );
};
