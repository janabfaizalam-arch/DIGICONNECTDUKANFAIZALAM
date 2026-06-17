"use client";

// src/app/admin/service-builder/create/steps/CommissionStep.tsx

import React, { useState } from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { CommissionEngine } from '@/types/service';

/**
 * Step 6 – Commission Engine configuration
 * Allows selection of commission type (fixed or percentage) and corresponding value.
 */
export const CommissionStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { state, updateData } = useWizard();
  const existing = state.data.commission as CommissionEngine | undefined;
  const [commission, setCommission] = useState<CommissionEngine>(
    existing || { type: 'fixed', value: 0 }
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setCommission((prev) => ({ ...prev, type: value as CommissionEngine['type'] }));
    } else if (name === 'value') {
      setCommission((prev) => ({ ...prev, value: Number(value) }));
    }
  };

  const handleNext = () => {
    updateData({ commission });
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Commission Engine</h2>
      <div className="grid gap-4 max-w-md">
        <label>
          Commission Type
          <select name="type" value={commission.type} onChange={handleChange}>
            <option value="fixed">Fixed Amount</option>
            <option value="percentage">Percentage</option>
          </select>
        </label>
        <label>
          Value {commission.type === 'percentage' ? '(%)' : '(₹)'}
          <input
            type="number"
            name="value"
            value={commission.value ?? ''}
            onChange={handleChange}
            min={0}
            required
          />
        </label>
      </div>
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
