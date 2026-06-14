// src/app/admin/service-builder/create/steps/DocumentRequirementsStep.tsx

import React, { useState } from 'react';
import { useWizard } from '@/app/admin/service-builder/create/ServiceWizardContext';
import { DocumentRequirement } from '@/types/service';

/**
 * Step 4 – Document Requirements
 * Hybrid upload UI (phase 1): native <input type="file" multiple>
 *   • Shows progress indicator (simple % based on file count)
 *   • Renders preview list (file name, size, required, reusable)
 */
export const DocumentRequirementsStep: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { state, updateData } = useWizard();
  const existing = state.data.documents || [];
  const [docs, setDocs] = useState<DocumentRequirement[]>(existing as DocumentRequirement[]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    // Simple progress based on selected count (phase 1 placeholder)
    setUploadProgress(selected.length > 0 ? 100 : 0);
  };

  const addDocument = () => {
    setDocs([
      ...docs,
      {
        id: crypto.randomUUID(),
        name: '',
        required: true,
        reusable: false,
      },
    ]);
  };

  const updateDoc = (index: number, partial: Partial<DocumentRequirement>) => {
    const updated = docs.map((d, i) => (i === index ? { ...d, ...partial } : d));
    setDocs(updated);
  };

  const deleteDoc = (index: number) => {
    setDocs(docs.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    // Persist document definitions (not the actual files – those will be uploaded later via the vault helper)
    updateData({ documents: docs });
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="step-title">Document Requirements</h2>

      {/* Native file upload – multiple support */}
      <label className="block mb-2">
        Upload Supporting Documents (optional)
        <input type="file" multiple onChange={handleFileChange} className="mt-1 block w-full" />
      </label>
      {files.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          <p>{files.length} file(s) selected – upload will occur on service publish.</p>
          <progress value={uploadProgress} max={100} className="w-full" />
        </div>
      )}

      {/* Document definition table */}
      <button type="button" onClick={addDocument} className="primary-btn mb-4">
        + Add Document Requirement
      </button>
      <ul className="space-y-3">
        {docs.map((doc, idx) => (
          <li key={doc.id} className="p-3 border rounded bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <strong>Document #{idx + 1}</strong>
              <button type="button" onClick={() => deleteDoc(idx)} className="text-red-600 small-btn">
                Delete
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                Name
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => updateDoc(idx, { name: e.target.value })}
                  placeholder="e.g., License"
                />
              </label>
              <label className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  checked={doc.required}
                  onChange={(e) => updateDoc(idx, { required: e.target.checked })}
                />
                Required
              </label>
              <label className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  checked={doc.reusable}
                  onChange={(e) => updateDoc(idx, { reusable: e.target.checked })}
                />
                Reusable (Customer Vault)
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
