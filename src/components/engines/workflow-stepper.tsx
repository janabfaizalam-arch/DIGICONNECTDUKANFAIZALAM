"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Play,
  ArrowRight,
  Clock,
  User,
  Sparkles,
  AlertCircle,
  BadgeAlert
} from "lucide-react";
import type { ServiceWorkflow } from "@/lib/services-engine";

interface TimelineEvent {
  id: string;
  event_title: string;
  event_description?: string | null;
  created_at: string;
  metadata?: {
    actor_name?: string | null;
    actor_role?: string | null;
  } | null;
}

interface WorkflowStepperProps {
  applicationId: string;
  currentStep: string;
  workflows: ServiceWorkflow[];
  timelines: TimelineEvent[];
  onTransitionSuccess?: () => void;
}

export function WorkflowStepper({
  applicationId,
  currentStep,
  workflows = [],
  timelines = [],
  onTransitionSuccess
}: WorkflowStepperProps) {
  const router = useRouter();
  const [selectedNextStep, setSelectedNextStep] = useState<string | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Clean and fallback workflow definitions if none exist in the DB
  const steps = workflows.length > 0 ? workflows : [
    { id: "1", service_id: "", step_key: "submitted", label: "Submitted", sort_order: 1, allowed_transitions: ["in_process", "rejected"] },
    { id: "2", service_id: "", step_key: "in_process", label: "Under Review", sort_order: 2, allowed_transitions: ["completed", "rejected"] },
    { id: "3", service_id: "", step_key: "completed", label: "Completed", sort_order: 3, allowed_transitions: [] },
    { id: "4", service_id: "", step_key: "rejected", label: "Rejected", sort_order: 4, allowed_transitions: [] }
  ];

  const currentStepObj = steps.find((s) => s.step_key === currentStep) || steps[0];
  const allowedTransitions = currentStepObj?.allowed_transitions || [];

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNextStep) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/ap/applications/${applicationId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nextStep: selectedNextStep,
          note: transitionNote.trim()
        })
      });

      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(data.error || "Failed to update workflow transition.");
      }

      setSelectedNextStep(null);
      setTransitionNote("");
      
      if (onTransitionSuccess) {
        onTransitionSuccess();
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("[workflow-stepper] Transition failed:", err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepStatus = (stepKey: string, stepOrder: number) => {
    if (currentStep === stepKey) return "active";
    
    const currentStepIndex = steps.findIndex((s) => s.step_key === currentStep);
    const stepIndex = steps.findIndex((s) => s.step_key === stepKey);

    if (currentStepIndex !== -1 && stepIndex !== -1) {
      return stepIndex < currentStepIndex ? "completed" : "pending";
    }
    
    // Fallback based on sorting order if keys can't find direct index
    const currentOrder = currentStepObj?.sort_order ?? 0;
    if (stepOrder < currentOrder) return "completed";
    return "pending";
  };

  const formatTimelineDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Stepper */}
      <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 md:p-6 backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          Application Workflow Progress
        </h3>

        {/* Horizontal steps flow */}
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.step_key, step.sort_order);
            return (
              <React.Fragment key={step.step_key}>
                {/* Step Item */}
                <div className="flex items-center md:flex-col md:text-center gap-3 md:gap-2 z-10 flex-1">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      status === "completed"
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm"
                        : status === "active"
                        ? "bg-indigo-600 border-2 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                        : "bg-white border border-slate-200 text-slate-400"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : status === "active" ? (
                      <Play className="h-4 w-4 fill-white" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left md:text-center">
                    <p
                      className={`text-xs font-extrabold capitalize ${
                        status === "active"
                          ? "text-indigo-600 font-black"
                          : status === "completed"
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Stage {idx + 1}
                    </span>
                  </div>
                </div>

                {/* Connection Line (hidden on last step) */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block h-0.5 flex-1 bg-gradient-to-r from-indigo-500/20 to-indigo-500/5 min-w-[20px]" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Allowed Transitions / Actions */}
      {allowedTransitions.length > 0 && (
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 md:p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available Operations
          </h3>
          
          {selectedNextStep ? (
            <form onSubmit={handleTransitionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                  Remarks / Notes for transition to <span className="text-indigo-600 uppercase font-extrabold">&quot;{steps.find(s => s.step_key === selectedNextStep)?.label}&quot;</span>
                </label>
                <textarea
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  placeholder="Provide details or instructions for this status change..."
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl px-4 py-3 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all resize-none min-h-[90px]"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-655 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNextStep(null);
                    setTransitionNote("");
                    setErrorMessage("");
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-xs font-bold text-white rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-500/10 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Transition
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {allowedTransitions.map((nextKey) => {
                const targetStep = steps.find((s) => s.step_key === nextKey);
                if (!targetStep) return null;

                const isCompletedOrRejected = ["completed", "rejected"].includes(nextKey);

                return (
                  <button
                    key={nextKey}
                    type="button"
                    onClick={() => setSelectedNextStep(nextKey)}
                    className={`h-11 px-4 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-2 border cursor-pointer ${
                      isCompletedOrRejected
                        ? nextKey === "completed"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50"
                          : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100/50"
                        : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/50"
                    }`}
                  >
                    Transition to {targetStep.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 md:p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-slate-450" />
          Activity Log & Timeline
        </h3>

        {timelines.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/60">
            {timelines.map((log) => (
              <div key={log.id} className="relative group animate-in fade-in duration-200">
                {/* Timeline Dot */}
                <div className="absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full border border-slate-200 bg-white flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-500 transition-colors" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-extrabold text-slate-800">
                      {log.event_title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      {formatTimelineDate(log.created_at)}
                    </span>
                  </div>
                  {log.event_description && (
                    <p className="text-xs text-slate-655 font-medium">
                      {log.event_description}
                    </p>
                  )}
                  {log.metadata?.actor_name && (
                    <span className="text-[10px] font-bold text-slate-450 flex items-center gap-1">
                      <User className="h-3 w-3" /> By {log.metadata.actor_name}
                      {log.metadata.actor_role && ` (${log.metadata.actor_role})`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-1">
            <BadgeAlert className="h-8 w-8 text-slate-400 mb-1" />
            <p className="text-xs font-bold text-slate-400">No events recorded on timeline yet</p>
            <span className="text-[10px] text-slate-500 font-semibold">Future application updates will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
}
