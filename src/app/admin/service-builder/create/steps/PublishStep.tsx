"use client";

import React from 'react';

export const PublishStep: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="publish-step">
      <h2 className="step-title">Publish Service</h2>
      <p className="my-4">Your service setup is complete. Click publish to deploy this service to the portal.</p>
      <div className="navigation-buttons mt-4 flex gap-2">
        <button type="button" onClick={onBack} className="secondary-btn">
          ← Back
        </button>
        <button type="button" onClick={() => alert("Publish functionality not fully implemented")} className="primary-btn">
          Publish
        </button>
      </div>
    </div>
  );
};
