"use client";

// src/app/admin/service-builder/create/steps/AutomationStep.tsx

import React, { useState } from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { AutomationRule } from '@/types/service';

/**
 * Step 7 – Automation Rules
 * Allows admin to select events (e.g., application_created) and actions that should be triggered.
 * Supports multiple selections; stored as an array of AutomationRule objects.
 */
export const AutomationStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { state, updateData } = useWizard();
  const existing = (state.data.automation as AutomationRule[]) || [];
  const [rules, setRules] = useState<AutomationRule[]>(existing);

  // Define a fixed list of supported events and actions based on decisions
  const availableEvents = [
    'application_created',
    'application_submitted',
    'application_completed',
    'service_created',
    'service_published',
  ];
  const availableActions = [
    'send_notification', // in‑app & email (handled by notification service)
    'credit_commission',
    'add_timeline',
    'crm_sync',
  ];

  const addRule = () => {
    setRules([
      ...rules,
      {
        event: availableEvents[0],
        actions: [],
      },
    ]);
  };

  const updateRule = (index: number, updated: Partial<AutomationRule>) => {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...updated } : r)));
  };

  const deleteRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const toggleAction = (ruleIdx: number, action: string) => {
    const rule = rules[ruleIdx];
    const actions = rule.actions.includes(action)
      ? rule.actions.filter((a) => a !== action)
      : [...rule.actions, action];
    updateRule(ruleIdx, { actions });
  };

  const handleNext = () => {
    updateData({ automation: rules });
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Automation Rules</h2>
      <button type="button" onClick={addRule} className="primary-btn mb-4">
        + Add Rule
      </button>
      <ul className="space-y-4">
        {rules.map((rule, idx) => (
          <li key={idx} className="p-4 border rounded bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <strong>Rule #{idx + 1}</strong>
              <button type="button" onClick={() => deleteRule(idx)} className="text-red-600 small-btn">
                Delete
              </button>
            </div>
            <label className="block mb-2">
              Event
              <select
                value={rule.event}
                onChange={(e) => updateRule(idx, { event: e.target.value })}
                className="mt-1 block w-full"
              >
                {availableEvents.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2">
              <span className="block mb-1">Actions (select any)</span>
              {availableActions.map((act) => (
                <label key={act} className="inline-flex items-center mr-4">
                  <input
                    type="checkbox"
                    checked={rule.actions.includes(act)}
                    onChange={() => toggleAction(idx, act)}
                  />
                  <span className="ml-2">{act.replace('_', ' ')}</span>
                </label>
              ))}
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
