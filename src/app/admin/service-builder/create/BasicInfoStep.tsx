// src/app/admin/service-builder/create/BasicInfoStep.tsx

import React, { useState } from 'react';
import { useServiceWizard } from './ServiceWizardContext';

/**
 * Step 1 – Basic Information about the service.
 * Collects: name, slug, description, status, category, processing time, icon.
 * The UI uses vanilla CSS classes for a clean premium look.
 */
export const BasicInfoStep: React.FC = () => {
  const { data, updateData, next } = useServiceWizard();
  const [form, setForm] = useState({
    name: data.service?.name || '',
    slug: data.service?.slug || '',
    description: data.service?.description || '',
    status: data.service?.status || 'draft',
    category: data.service?.category || '',
    processing_time_hours: data.service?.processing_time_hours || 0,
    icon_type: data.service?.icon_type || 'predefined',
    icon_value: data.service?.icon_value || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'processing_time_hours' ? Number(value) : value }));
  };

  const handleNext = () => {
    // Simple validation
    if (!form.name || !form.slug) {
      alert('Name and Slug are required');
      return;
    }
    updateData({
      service: {
        ...data.service,
        name: form.name,
        slug: form.slug,
        description: form.description,
        status: form.status as 'draft' | 'published',
        category: form.category,
        processing_time_hours: form.processing_time_hours,
        icon_type: form.icon_type as 'predefined' | 'custom',
        icon_value: form.icon_value,
      },
    });
    next();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Basic Information</h2>
      <div className="form-grid">
        <label>
          Service Name
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Slug (URL friendly)
          <input type="text" name="slug" value={form.slug} onChange={handleChange} required />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label>
          Category
          <input type="text" name="category" value={form.category} onChange={handleChange} />
        </label>
        <label>
          Processing Time (hrs)
          <input type="number" name="processing_time_hours" value={form.processing_time_hours} onChange={handleChange} min={0} />
        </label>
        <label>
          Icon Type
          <select name="icon_type" value={form.icon_type} onChange={handleChange}>
            <option value="predefined">Predefined</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          Icon Value (key or URL)
          <input type="text" name="icon_value" value={form.icon_value} onChange={handleChange} />
        </label>
      </div>
      <div className="navigation-buttons">
        <button type="button" onClick={handleNext} className="primary-btn">Next →</button>
      </div>
    </div>
  );
};
