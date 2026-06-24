"use client";

import React, { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  LoaderCircle,
  Settings,
  FileText,
  Settings2,
  GitFork,
  AlertCircle,
  Check,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminService, DbServiceCategory } from "@/lib/services";
import { ServiceField, ServiceWorkflow, ValidationRule } from "@/lib/services-engine";
import { AdminServiceWizard } from "./admin-service-wizard";

interface AdminEngineConfigTabsProps {
  service: AdminService;
  categories: DbServiceCategory[];
  initialFields: ServiceField[];
  initialWorkflows: ServiceWorkflow[];
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "number", label: "Number Input" },
  { value: "mobile", label: "Mobile Number" },
  { value: "email", label: "Email Address" },
  { value: "date", label: "Date Picker" },
  { value: "dropdown", label: "Select Dropdown" },
  { value: "radio", label: "Radio Selection" },
  { value: "checkbox", label: "Checkbox Options" },
  { value: "address", label: "Address Box" },
  { value: "file_upload", label: "Document Upload" },
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "gstin", label: "GSTIN Certificate" }
];

const VALIDATION_RULES: { value: ValidationRule["rule"]; label: string; needsVal: boolean }[] = [
  { value: "required", label: "Required Field", needsVal: false },
  { value: "minLength", label: "Min Length", needsVal: true },
  { value: "maxLength", label: "Max Length", needsVal: true },
  { value: "pattern", label: "Regex Pattern", needsVal: true },
  { value: "email", label: "Valid Email Format", needsVal: false },
  { value: "mobile", label: "Valid 10-Digit Mobile", needsVal: false },
  { value: "aadhaar", label: "Valid Aadhaar Format", needsVal: false },
  { value: "pan", label: "Valid PAN Card Format", needsVal: false },
  { value: "gstin", label: "Valid GSTIN Format", needsVal: false }
];

export function AdminEngineConfigTabs({
  service,
  categories,
  initialFields,
  initialWorkflows
}: AdminEngineConfigTabsProps) {
  const [activeTab, setActiveTab] = useState<"cms" | "configs" | "fields" | "workflows">("cms");
  const [baseCustomerFee, setBaseCustomerFee] = useState<number>(Number(service.base_customer_fee ?? 0));
  const [tatHours, setTatHours] = useState<number>(Number(service.tat_hours ?? 48));
  const [metadataStr, setMetadataStr] = useState<string>(
    JSON.stringify(service.metadata ?? {}, null, 2)
  );

  const [fields, setFields] = useState<ServiceField[]>(() =>
    initialFields.map((f) => ({
      ...f,
      validation_chains: Array.isArray(f.validation_chains) ? f.validation_chains : []
    }))
  );

  const [workflows, setWorkflows] = useState<ServiceWorkflow[]>(() => {
    if (initialWorkflows.length > 0) {
      return initialWorkflows.map((w) => ({
        ...w,
        allowed_transitions: Array.isArray(w.allowed_transitions) ? w.allowed_transitions : []
      }));
    }
    return [
      { id: "1", service_id: service.id, step_key: "submitted", label: "Submitted", sort_order: 10, allowed_transitions: ["in_process", "rejected"] },
      { id: "2", service_id: service.id, step_key: "in_process", label: "Under Review", sort_order: 20, allowed_transitions: ["completed", "rejected"] },
      { id: "3", service_id: service.id, step_key: "completed", label: "Completed", sort_order: 30, allowed_transitions: [] },
      { id: "4", service_id: service.id, step_key: "rejected", label: "Rejected", sort_order: 40, allowed_transitions: [] }
    ];
  });

  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const handleMetadataChange = (val: string) => {
    setMetadataStr(val);
  };

  const addField = () => {
    const nextSort = fields.length > 0 ? Math.max(...fields.map((f) => f.sort_order)) + 10 : 10;
    const newField: ServiceField = {
      id: crypto.randomUUID(),
      service_id: service.id,
      field_key: `new_field_${Date.now()}`,
      label: "New Field",
      field_type: "text",
      sort_order: nextSort,
      validation_chains: [],
      default_value: null
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<ServiceField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    // Recalculate sort_order
    const updated = newFields.map((f, idx) => ({
      ...f,
      sort_order: (idx + 1) * 10
    }));
    setFields(updated);
  };

  const addValidationRule = (fieldId: string, ruleType: ValidationRule["rule"]) => {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        const exists = f.validation_chains.some((r) => r.rule === ruleType);
        if (exists) return f;

        const newRule: ValidationRule = {
          rule: ruleType,
          msg: ""
        };
        if (ruleType === "minLength" || ruleType === "maxLength") {
          newRule.val = 5;
        } else if (ruleType === "pattern") {
          newRule.val = "^[A-Za-z0-9]+$";
        }

        return {
          ...f,
          validation_chains: [...f.validation_chains, newRule]
        };
      })
    );
  };

  const removeValidationRule = (fieldId: string, ruleType: ValidationRule["rule"]) => {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          validation_chains: f.validation_chains.filter((r) => r.rule !== ruleType)
        };
      })
    );
  };

  const updateValidationRule = (
    fieldId: string,
    ruleType: ValidationRule["rule"],
    updates: Partial<ValidationRule>
  ) => {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          validation_chains: f.validation_chains.map((r) =>
            r.rule === ruleType ? { ...r, ...updates } : r
          )
        };
      })
    );
  };

  const addWorkflowStep = () => {
    const nextSort = workflows.length > 0 ? Math.max(...workflows.map((w) => w.sort_order)) + 10 : 10;
    const newStep: ServiceWorkflow = {
      id: crypto.randomUUID(),
      service_id: service.id,
      step_key: `new_step_${Date.now()}`,
      label: "New Step",
      sort_order: nextSort,
      allowed_transitions: []
    };
    setWorkflows([...workflows, newStep]);
  };

  const removeWorkflowStep = (id: string) => {
    const stepToDelete = workflows.find((w) => w.id === id);
    if (!stepToDelete) return;
    const deletedKey = stepToDelete.step_key;

    // Filter out step and remove occurrences in allowed_transitions
    const filtered = workflows
      .filter((w) => w.id !== id)
      .map((w) => ({
        ...w,
        allowed_transitions: w.allowed_transitions.filter((key) => key !== deletedKey)
      }));
    setWorkflows(filtered);
  };

  const updateWorkflowStep = (id: string, updates: Partial<ServiceWorkflow>) => {
    const oldStep = workflows.find((w) => w.id === id);
    if (!oldStep) return;

    // If key changes, we need to update references in allowed_transitions of other steps
    if (updates.step_key && updates.step_key !== oldStep.step_key) {
      const oldKey = oldStep.step_key;
      const newKey = updates.step_key.trim();

      setWorkflows(
        workflows.map((w) => {
          let updatedTransitions = [...w.allowed_transitions];
          if (w.id === id) {
            return { ...w, ...updates };
          }
          if (updatedTransitions.includes(oldKey)) {
            updatedTransitions = updatedTransitions.map((k) => (k === oldKey ? newKey : k));
          }
          return { ...w, allowed_transitions: updatedTransitions };
        })
      );
    } else {
      setWorkflows(workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    }
  };

  const moveWorkflowStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workflows.length) return;

    const newWorkflows = [...workflows];
    const temp = newWorkflows[index];
    newWorkflows[index] = newWorkflows[targetIndex];
    newWorkflows[targetIndex] = temp;

    const updated = newWorkflows.map((w, idx) => ({
      ...w,
      sort_order: (idx + 1) * 10
    }));
    setWorkflows(updated);
  };

  const toggleTransition = (stepId: string, targetKey: string) => {
    setWorkflows(
      workflows.map((w) => {
        if (w.id !== stepId) return w;
        const exists = w.allowed_transitions.includes(targetKey);
        const updatedTransitions = exists
          ? w.allowed_transitions.filter((k) => k !== targetKey)
          : [...w.allowed_transitions, targetKey];
        return {
          ...w,
          allowed_transitions: updatedTransitions
        };
      })
    );
  };

  const saveEngineConfig = () => {
    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(metadataStr);
    } catch {
      toastError("Metadata must be valid JSON.");
      return;
    }

    // Validate fields keys uniqueness and format
    const keys = fields.map((f) => f.field_key.trim());
    const hasDuplicateKeys = keys.some((k, idx) => keys.indexOf(k) !== idx);
    if (hasDuplicateKeys) {
      toastError("All form fields must have unique Field Keys.");
      return;
    }
    const invalidKeys = keys.filter((k) => !/^[a-z0-9_]+$/i.test(k));
    if (invalidKeys.length > 0) {
      toastError(`Invalid Field Keys: "${invalidKeys.join(", ")}". Use only letters, numbers, and underscores.`);
      return;
    }

    // Validate workflow step keys uniqueness and format
    const stepKeys = workflows.map((w) => w.step_key.trim());
    const hasDuplicateSteps = stepKeys.some((s, idx) => stepKeys.indexOf(s) !== idx);
    if (hasDuplicateSteps) {
      toastError("All workflow stages must have unique Step Keys.");
      return;
    }
    const invalidSteps = stepKeys.filter((s) => !/^[a-z0-9_]+$/i.test(s));
    if (invalidSteps.length > 0) {
      toastError(`Invalid Step Keys: "${invalidSteps.join(", ")}". Use only letters, numbers, and underscores.`);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/services/${service.id}/engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            base_customer_fee: baseCustomerFee,
            tat_hours: tatHours,
            metadata: parsedMetadata,
            fields: fields.map((f) => ({
              field_key: f.field_key.trim(),
              label: f.label.trim(),
              field_type: f.field_type,
              sort_order: f.sort_order,
              validation_chains: f.validation_chains,
              default_value: f.default_value
            })),
            workflows: workflows.map((w) => ({
              step_key: w.step_key.trim(),
              label: w.label.trim(),
              sort_order: w.sort_order,
              allowed_transitions: w.allowed_transitions
            }))
          })
        });

        const result = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Failed to save engine configuration.");
        }

        success(result.message || "Engine configuration saved successfully.");
      } catch (err: unknown) {
        toastError(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab bar header */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/50 p-1.5 rounded-2xl gap-1.5 max-w-2xl">
        <button
          onClick={() => setActiveTab("cms")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === "cms"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          Page Layout & CMS
        </button>

        <button
          onClick={() => setActiveTab("configs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === "configs"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Settings className="h-4 w-4" />
          DS-OS Configs
        </button>

        <button
          onClick={() => setActiveTab("fields")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === "fields"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Form Fields Registry
        </button>

        <button
          onClick={() => setActiveTab("workflows")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === "workflows"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <GitFork className="h-4 w-4" />
          Workflow Transitions
        </button>
      </div>

      {/* Tabs panels */}
      <div className="animate-in fade-in-50 duration-200">
        {activeTab === "cms" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-850">Legacy Layout CMS Editor</h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Update public landing page blocks, FAQs, visual banners, and SEO tags.
                </p>
              </div>
            </div>
            <AdminServiceWizard service={service} categories={categories} />
          </div>
        )}

        {activeTab === "configs" && (
          <div className="grid gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Service SLA & Dynamic Pricing</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Base Customer Fee (₹)
                  </label>
                  <Input
                    type="number"
                    value={baseCustomerFee}
                    onChange={(e) => setBaseCustomerFee(Number(e.target.value))}
                    placeholder="e.g. 500"
                    min="0"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    The customer fee dynamically charged when applying for this service.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    TAT SLA Guarantee (Hours)
                  </label>
                  <Input
                    type="number"
                    value={tatHours}
                    onChange={(e) => setTatHours(Number(e.target.value))}
                    placeholder="e.g. 48"
                    min="1"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Target Turnaround SLA duration configured for workflow resolution updates.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  Metadata Parameters (JSON)
                  <span title="Custom properties needed for complex logic integrations." className="cursor-help">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                </label>
                <Textarea
                  value={metadataStr}
                  onChange={(e) => handleMetadataChange(e.target.value)}
                  placeholder="{}"
                  className="font-mono text-xs min-h-[160px] bg-slate-50 focus:bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Define additional configuration key-value inputs as valid JSON.
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fields" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Dynamic Form Fields</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Configure form controls dynamically loaded for partner applications.
                </p>
              </div>
              <Button onClick={addField} variant="outline" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Field Registry
              </Button>
            </div>

            <div className="grid gap-4">
              {fields.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-450">
                  <Settings2 className="h-8 w-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs font-extrabold">No dynamic fields registered.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click Add Field Registry to configure one.</p>
                </div>
              ) : (
                fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 relative hover:border-slate-300 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div className="grid gap-3 grid-cols-1 md:grid-cols-3 flex-1 w-full">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Field Key (DB identifier)
                          </label>
                          <Input
                            value={field.field_key}
                            onChange={(e) => updateField(field.id, { field_key: e.target.value })}
                            placeholder="e.g. business_name"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Display Label
                          </label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="e.g. Business Name"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Field Type
                          </label>
                          <Select
                            value={field.field_type}
                            onValueChange={(val) => updateField(field.id, { field_type: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end md:self-auto shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveField(idx, "up")}
                          disabled={idx === 0}
                          className="h-8 w-8"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveField(idx, "down")}
                          disabled={idx === fields.length - 1}
                          className="h-8 w-8"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeField(field.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Remove field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Default Pre-fill Value (Optional)
                        </label>
                        <Input
                          value={field.default_value || ""}
                          onChange={(e) => updateField(field.id, { default_value: e.target.value || null })}
                          placeholder="e.g. Individual"
                        />
                      </div>

                      {/* Rule configuration trigger */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Add Validation Constraints
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {VALIDATION_RULES.map((rule) => {
                            const isAdded = field.validation_chains.some((r) => r.rule === rule.value);
                            return (
                              <button
                                key={rule.value}
                                onClick={() =>
                                  isAdded
                                    ? removeValidationRule(field.id, rule.value)
                                    : addValidationRule(field.id, rule.value)
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all duration-150 flex items-center gap-1 ${
                                  isAdded
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100"
                                }`}
                              >
                                {isAdded && <Check className="h-3 w-3" />}
                                {rule.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Active validation rules configuration */}
                    {field.validation_chains.length > 0 && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 block">
                          Validation Rules Details
                        </span>
                        <div className="grid gap-3">
                          {field.validation_chains.map((ruleObj) => {
                            const ruleDef = VALIDATION_RULES.find((r) => r.value === ruleObj.rule);
                            return (
                              <div
                                key={ruleObj.rule}
                                className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-white border border-slate-200/50 p-2.5 rounded-lg text-xs"
                              >
                                <span className="font-extrabold text-slate-750 shrink-0 uppercase tracking-wide text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                  {ruleDef?.label || ruleObj.rule}
                                </span>

                                {ruleDef?.needsVal && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-semibold shrink-0">Constraint:</span>
                                    <Input
                                      type={ruleObj.rule === "pattern" ? "text" : "number"}
                                      value={String(ruleObj.val ?? "")}
                                      onChange={(e) =>
                                        updateValidationRule(field.id, ruleObj.rule, {
                                          val: ruleObj.rule === "pattern" ? e.target.value : Number(e.target.value)
                                        })
                                      }
                                      className="h-8 max-w-[180px] text-xs"
                                    />
                                  </div>
                                )}

                                <div className="flex-1 w-full">
                                  <Input
                                    placeholder="Custom error message (optional)"
                                    value={ruleObj.msg || ""}
                                    onChange={(e) =>
                                      updateValidationRule(field.id, ruleObj.rule, { msg: e.target.value })
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>

                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeValidationRule(field.id, ruleObj.rule)}
                                  className="h-7 w-7 text-red-500 hover:bg-red-50 shrink-0 self-end md:self-auto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "workflows" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">State Machine Workflows</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Configure status stages and allowed transition permissions for this service.
                </p>
              </div>
              <Button onClick={addWorkflowStep} variant="outline" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Add Workflow Stage
              </Button>
            </div>

            <div className="grid gap-4">
              {workflows.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-450">
                  <GitFork className="h-8 w-8 mx-auto mb-2 text-slate-350" />
                  <p className="text-xs font-extrabold">No workflow stages configured.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click Add Workflow Stage to configure steps.</p>
                </div>
              ) : (
                workflows.map((step, idx) => (
                  <div
                    key={step.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 flex-1 w-full">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Step Key (unique string)
                          </label>
                          <Input
                            value={step.step_key}
                            onChange={(e) => updateWorkflowStep(step.id, { step_key: e.target.value })}
                            placeholder="e.g. in_process"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Display Label
                          </label>
                          <Input
                            value={step.label}
                            onChange={(e) => updateWorkflowStep(step.id, { label: e.target.value })}
                            placeholder="e.g. Under Review"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveWorkflowStep(idx, "up")}
                          disabled={idx === 0}
                          className="h-8 w-8"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveWorkflowStep(idx, "down")}
                          disabled={idx === workflows.length - 1}
                          className="h-8 w-8"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeWorkflowStep(step.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Remove stage"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Allowed Transitions from &quot;{step.label}&quot; to:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {workflows
                          .filter((w) => w.step_key !== step.step_key)
                          .map((target) => {
                            const isAllowed = step.allowed_transitions.includes(target.step_key);
                            return (
                              <button
                                key={target.step_key}
                                onClick={() => toggleTransition(step.id, target.step_key)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 ${
                                  isAllowed
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-100"
                                }`}
                              >
                                {target.label} ({target.step_key})
                              </button>
                            );
                          })}
                        {workflows.length <= 1 && (
                          <span className="text-[10px] text-slate-400 font-semibold italic">
                            Create additional stages to configure transitions.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save action bar for engine panels */}
      {activeTab !== "cms" && (
        <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm mt-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            Ensure you validate configurations before saving.
          </div>
          <Button
            onClick={saveEngineConfig}
            disabled={isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/20"
          >
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Engine Configuration
          </Button>
        </div>
      )}
    </div>
  );
}
