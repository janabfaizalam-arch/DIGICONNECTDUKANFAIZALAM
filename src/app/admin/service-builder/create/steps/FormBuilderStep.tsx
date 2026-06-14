// src/app/admin/service-builder/create/steps/FormBuilderStep.tsx

import React, { useState } from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { ServiceField } from '@/types/service';

/**
 * Step 2 – Form Builder
 * Allows admins to define dynamic form fields.
 * A lightweight custom drag‑and‑drop list is used for ordering.
 * Supports add, duplicate, delete, up/down reordering, and editing of field properties.
 */
export const FormBuilderStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { state, updateData } = useWizard();
  const [fields, setFields] = useState<ServiceField[]>(state.data.fields || []);

  const addField = () => {
    const newField: ServiceField = {
      id: crypto.randomUUID(),
      service_id: '', // will be filled on persist
      field_key: `field_${fields.length + 1}`,
      label: `New Field ${fields.length + 1}`,
      field_type: 'text',
      sort_order: fields.length,
      validation_chains: [],
      default_value: null,
    };
    setFields([...fields, newField]);
  };

  const duplicateField = (index: number) => {
    const field = fields[index];
    const copy = { ...field, id: crypto.randomUUID(), field_key: `${field.field_key}_copy` };
    setFields([...fields.slice(0, index + 1), copy, ...fields.slice(index + 1)]);
  };

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const updated = [...fields];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setFields(updated.map((f, i) => ({ ...f, sort_order: i })));
  };

  const updateField = (index: number, partial: Partial<ServiceField>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...partial } : f));
    setFields(updated);
  };

  const handleNext = () => {
    updateData({ fields });
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Form Builder</h2>
      <button type="button" onClick={addField} className="primary-btn mb-4">
        + Add Field
      </button>
      <ul className="field-list space-y-3">
        {fields.map((field, idx) => (
          <li
            key={field.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
            onDrop={(e) => {
              const from = Number(e.dataTransfer.getData('text/plain'));
              const to = idx;
              moveField(from, to);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="p-4 border rounded bg-gray-50"
          >
            <div className="flex justify-between items-center mb-2">
              <strong>{field.label}</strong>
              <div className="space-x-2">
                <button type="button" onClick={() => duplicateField(idx)} className="small-btn">
                  Duplicate
                </button>
                <button type="button" onClick={() => deleteField(idx)} className="small-btn text-red-600">
                  Delete
                </button>
                <button type="button" onClick={() => moveField(idx, idx - 1)} disabled={idx === 0} className="small-btn">
                  ↑
                </button>
                <button type="button" onClick={() => moveField(idx, idx + 1)} disabled={idx === fields.length - 1} className="small-btn">
                  ↓
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                Label
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                />
              </label>
              <label>
                Key
                <input
                  type="text"
                  value={field.field_key}
                  onChange={(e) => updateField(idx, { field_key: e.target.value })}
                />
              </label>
              <label>
                Type
                <select
                  value={field.field_type}
                  onChange={(e) => updateField(idx, { field_type: e.target.value })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="mobile">Mobile</option>
                  <option value="date">Date</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="radio">Radio</option>
                  <option value="file">File Upload</option>
                  <option value="aadhaar">Aadhaar</option>
                  <option value="pan">PAN</option>
                  <option value="gstin">GSTIN</option>
                </select>
              </label>
              <label>
                Default
                <input
                  type="text"
                  value={field.default_value ?? ''}
                  onChange={(e) => updateField(idx, { default_value: e.target.value || null })}
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
