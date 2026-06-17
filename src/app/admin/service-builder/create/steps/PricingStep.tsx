"use client";

// src/app/admin/service-builder/create/steps/PricingStep.tsx

import React, { useState } from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { PricingEngine } from '@/types/service';

/**
 * Step 5 – Pricing Engine configuration
 * Allows input of customer price, partner cost and optional tax percent.
 * Dynamic pricing toggle is displayed but disabled for now (future).
 */
export const PricingStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { state, updateData } = useWizard();
  const existing = state.data.pricing as PricingEngine | undefined;
  const [pricing, setPricing] = useState<PricingEngine>(
    existing || { customer_price: 0, partner_cost: 0, tax_percent: 0, dynamic_pricing: false }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPricing((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value),
    }));
  };

  const handleNext = () => {
    updateData({ pricing });
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Pricing Engine</h2>
      <div className="grid gap-4 max-w-md">
        <label>
          Customer Price (₹)
          <input
            type="number"
            name="customer_price"
            value={pricing.customer_price}
            onChange={handleChange}
            min={0}
            required
          />
        </label>
        <label>
          Partner Cost (₹)
          <input type="number" name="partner_cost" value={pricing.partner_cost} onChange={handleChange} min={0} required />
        </label>
        <label>
          Tax Percent (%)
          <input
            type="number"
            name="tax_percent"
            value={pricing.tax_percent ?? ''}
            onChange={handleChange}
            min={0}
            max={100}
          />
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="dynamic_pricing"
            checked={pricing.dynamic_pricing ?? false}
            onChange={handleChange}
            disabled
          />
          <span className="ml-2 text-gray-500">Enable Dynamic Pricing (future)</span>
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
