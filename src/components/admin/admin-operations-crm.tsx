"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, ShieldCheck, MessageSquare, Plus,
  Send, User, Trash2, Pin, CheckSquare, ChevronRight
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

// 10 Configurable Workflow Stages
const WORKFLOW_STAGES = [
  { id: "draft", label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200", slaHours: 2 },
  { id: "payment_pending", label: "Payment Pending", color: "bg-amber-50 text-amber-700 border-amber-200", slaHours: 24 },
  { id: "documents_pending", label: "Documents Pending", color: "bg-orange-50 text-orange-700 border-orange-200", slaHours: 48 },
  { id: "verification", label: "Verification", color: "bg-blue-50 text-blue-700 border-blue-200", slaHours: 12 },
  { id: "under_review", label: "Under Review", color: "bg-indigo-50 text-indigo-700 border-indigo-200", slaHours: 24 },
  { id: "submitted", label: "Gov Submission", color: "bg-purple-50 text-purple-700 border-purple-200", slaHours: 8 },
  { id: "in_progress", label: "Gov Processing", color: "bg-violet-50 text-violet-700 border-violet-200", slaHours: 120 },
  { id: "approved", label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200", slaHours: 4 },
  { id: "completed", label: "Completed", color: "bg-teal-50 text-teal-700 border-teal-200", slaHours: 2 },
  { id: "delivered", label: "Delivered", color: "bg-green-50 text-green-700 border-green-200", slaHours: 1 }
];

interface InternalTask {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  assignedTo: string;
  dueDate: string;
}

interface ApprovalLevel {
  level: "Executive" | "Branch Manager" | "Operations Manager" | "Admin";
  status: "pending" | "approved" | "returned" | "rejected";
  approvedBy: string;
  remarks: string;
  timestamp: string;
}

interface InternalNote {
  id: string;
  text: string;
  pinned: boolean;
  author: string;
  timestamp: string;
}

interface AuditLog {
  action: string;
  user: string;
  timestamp: string;
  ip: string;
  device: string;
  browser: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "resolved" | "pending";
  created_at: string;
}

interface CustomerCRMData {
  familyMembers: string[];
  businessDetails: string;
  favorites: string[];
  tags: string[];
  tickets: SupportTicket[];
}

export interface AdminOperationsCRMProps {
  applicationId: string;
  currentStatus: string;
  currentPaymentStatus?: string;
  customer: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    created_at?: string;
  };
  serviceName: string;
  serviceSlug?: string;
  initialFormData: Record<string, unknown>;
}

export function AdminOperationsCRM({
  applicationId,
  currentStatus,
  customer,
  serviceName,
  initialFormData
}: AdminOperationsCRMProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [, startTransition] = useTransition();

  // Active Menu sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<"workflow" | "tasks" | "approvals" | "crm" | "comms" | "audit">("workflow");

  // Read persisted CRM values from JSONB form_data, or fall back to defaults
  const [tasks, setTasks] = useState<InternalTask[]>(
    (initialFormData.v3_tasks as InternalTask[]) || [
      { id: "t1", title: "Verify Aadhaar Details", completed: false, priority: "high", assignedTo: "Faizal Alam", dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
      { id: "t2", title: "Check PAN Legitimacy", completed: false, priority: "medium", assignedTo: "Amit Kumar", dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
      { id: "t3", title: "Collect Applicant Signature", completed: false, priority: "low", assignedTo: "Unassigned", dueDate: new Date(Date.now() + 172800000).toISOString().split("T")[0] },
      { id: "t4", title: "Upload Dossier to Gov Portal", completed: false, priority: "high", assignedTo: "Faizal Alam", dueDate: new Date(Date.now() + 172800000).toISOString().split("T")[0] }
    ]
  );

  const [approvals, setApprovals] = useState<ApprovalLevel[]>(
    (initialFormData.v3_approvals as ApprovalLevel[]) || [
      { level: "Executive", status: "approved", approvedBy: "Faizal Alam", remarks: "All documents matches matching criteria", timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString() },
      { level: "Branch Manager", status: "pending", approvedBy: "", remarks: "", timestamp: "" },
      { level: "Operations Manager", status: "pending", approvedBy: "", remarks: "", timestamp: "" },
      { level: "Admin", status: "pending", approvedBy: "", remarks: "", timestamp: "" }
    ]
  );

  const [internalNotes, setInternalNotes] = useState<InternalNote[]>(
    (initialFormData.v3_notes as InternalNote[]) || [
      { id: "n1", text: "Customer requested processing updates on WhatsApp.", pinned: true, author: "Faizal Alam", timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString() }
    ]
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(
    (initialFormData.v3_audit as AuditLog[]) || [
      { action: "Application Created", user: customer.name, timestamp: new Date(Date.now() - 3600000 * 12).toLocaleString(), ip: "103.88.22.14", device: "Android Phone", browser: "Chrome Mobile" },
      { action: "Payment Confirmed", user: "Razorpay Gateway", timestamp: new Date(Date.now() - 3600000 * 11).toLocaleString(), ip: "13.234.12.80", device: "Server Hook", browser: "Axios client" }
    ]
  );

  const [crmMetadata] = useState<CustomerCRMData>(
    (initialFormData.v3_crm as CustomerCRMData) || {
      familyMembers: ["Arif Alam (Brother)", "Sofia Alam (Sister)"],
      businessDetails: "Faizal Retail Shop & Digital Solutions",
      favorites: ["GST Registration", "PVC Cards Print"],
      tags: ["VIP Customer", "Priority Partner"],
      tickets: [
        { id: "TCK-8921", subject: "Aadhaar verification delay feedback", status: "resolved", created_at: "2026-06-25" },
        { id: "TCK-9041", subject: "Invoice calculation adjustment request", status: "open", created_at: "2026-06-28" }
      ]
    }
  );

  // SLA states
  const slaRemainingHours = 34; // Simulated dynamic hours countdown
  const isSlaOverdue = false;

  // Form Fields Inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTaskAssignee] = useState("Unassigned");
  
  const [newNoteText, setNewNoteText] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");

  // Unified Comms Center templates
  const commTemplates = [
    { type: "WhatsApp", title: "Documents Required Reminder", body: "Dear {{CUSTOMER_NAME}}, some documents uploaded for your {{SERVICE_NAME}} application are unclear. Please upload clear copies." },
    { type: "WhatsApp", title: "Submission Confirmation", body: "Hello {{CUSTOMER_NAME}}, your {{SERVICE_NAME}} case ID {{APPLICATION_ID}} has been successfully filed with the Government department." },
    { type: "Email", title: "Delivered Status Alert", body: "Hello, the final certificate / document for {{SERVICE_NAME}} is now ready. Click the link to download." }
  ];

  // Helper trigger to save CRM states to Database JSONB form_data
  const saveCrmUpdates = (updatesObj: Record<string, unknown>, successMsg: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData: updatesObj
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "Failed to update operations CRM data.");
        }

        toastSuccess(successMsg);
        router.refresh();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Update failed.";
        toastError(errorMsg);
      }
    });
  };

  // Workflow Change handler
  const handleWorkflowStageChange = (nextStage: string) => {
    startTransition(async () => {
      try {
        // Record transition inside Audit Logs
        const newLog: AuditLog = {
          action: `Workflow Stage changed to ${nextStage}`,
          user: "Admin (Faizal)",
          timestamp: new Date().toLocaleString(),
          ip: "103.88.22.14",
          device: "Windows Desktop",
          browser: "Chrome v120"
        };
        const updatedAudit = [newLog, ...auditLogs];
        setAuditLogs(updatedAudit);

        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStage,
            note: `Workflow transitioned to stage: ${nextStage}`,
            formData: {
              v3_audit: updatedAudit
            }
          })
        });

        if (!response.ok) {
          throw new Error("Failed to change stage.");
        }

        toastSuccess(`Workflow status updated to ${nextStage}!`);
        router.refresh();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Transition failed.";
        toastError(errorMsg);
      }
    });
  };

  // Task list modifiers
  const toggleTaskCompletion = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextState = !t.completed;
        // Log action in audit trail
        const auditLog: AuditLog = {
          action: `Task [${t.title}] marked as ${nextState ? "Completed" : "Incomplete"}`,
          user: "Admin (Faizal)",
          timestamp: new Date().toLocaleString(),
          ip: "103.88.22.14",
          device: "Windows Desktop",
          browser: "Chrome v120"
        };
        setAuditLogs((prev) => [auditLog, ...prev]);
        return { ...t, completed: nextState };
      }
      return t;
    });

    setTasks(updated);
    saveCrmUpdates({
      v3_tasks: updated,
      v3_audit: [
        {
          action: "Tasks list state modified",
          user: "Admin (Faizal)",
          timestamp: new Date().toLocaleString(),
          ip: "103.88.22.14",
          device: "Windows Desktop",
          browser: "Chrome v120"
        },
        ...auditLogs
      ]
    }, "Task status saved.");
  };

  const handleAddNewTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: InternalTask = {
      id: "tk-" + Date.now(),
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      assignedTo: newTaskAssignee,
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0]
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    setNewTaskTitle("");
    saveCrmUpdates({ v3_tasks: updated }, "New task added.");
  };

  const handleTaskDelete = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    saveCrmUpdates({ v3_tasks: updated }, "Task deleted.");
  };

  // Pinned Internal Notes
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: InternalNote = {
      id: "nt-" + Date.now(),
      text: newNoteText.trim(),
      pinned: false,
      author: "Faizal Alam",
      timestamp: new Date().toLocaleString()
    };

    const updated = [newNote, ...internalNotes];
    setInternalNotes(updated);
    setNewNoteText("");
    saveCrmUpdates({ v3_notes: updated }, "Private internal note added.");
  };

  const handlePinNote = (noteId: string) => {
    const updated = internalNotes.map((n) => {
      if (n.id === noteId) return { ...n, pinned: !n.pinned };
      return n;
    });
    setInternalNotes(updated);
    saveCrmUpdates({ v3_notes: updated }, "Note pinned state toggled.");
  };

  // Approvals Engine Actions
  const handleApprovalSubmit = (level: string, action: "approved" | "returned" | "rejected") => {
    const updated = approvals.map((a) => {
      if (a.level === level) {
        return {
          ...a,
          status: action,
          approvedBy: "Faizal Alam",
          remarks: approvalRemarks || `${level} Review completed`,
          timestamp: new Date().toLocaleString()
        };
      }
      return a;
    });

    setApprovals(updated);
    setApprovalRemarks("");
    saveCrmUpdates({
      v3_approvals: updated,
      v3_audit: [
        {
          action: `Approval level [${level}] set to ${action}`,
          user: "Admin (Faizal)",
          timestamp: new Date().toLocaleString(),
          ip: "103.88.22.14",
          device: "Windows Desktop",
          browser: "Chrome v120"
        },
        ...auditLogs
      ]
    }, `Approval level ${level} updated successfully!`);
  };

  // Comms simulator dispatch trigger
  const handleTriggerCommsDispatch = (template: typeof commTemplates[0]) => {
    const message = template.body
      .replace("{{CUSTOMER_NAME}}", customer.name)
      .replace("{{SERVICE_NAME}}", serviceName)
      .replace("{{APPLICATION_ID}}", applicationId.slice(0, 8));

    // Log notification in audit trail
    const commLog: AuditLog = {
      action: `Dispatched ${template.type}: ${template.title} ("${message}")`,
      user: "System Notification Gateway",
      timestamp: new Date().toLocaleString(),
      ip: "127.0.0.1",
      device: "API Webhook",
      browser: "Node Notification Trigger"
    };

    const updatedAudit = [commLog, ...auditLogs];
    setAuditLogs(updatedAudit);
    saveCrmUpdates({ v3_audit: updatedAudit }, `Unified ${template.type} alert sent to customer!`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6 items-start mt-6 w-full">
      
      {/* Console Side Menu */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs shrink-0">
        <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest px-3 mb-2">
          Operations Modules
        </h3>
        
        {[
          { id: "workflow" as const, label: "Workflow Timeline", icon: ChevronRight },
          { id: "tasks" as const, label: "Internal Tasks", icon: CheckSquare },
          { id: "approvals" as const, label: "Review Approvals", icon: ShieldCheck },
          { id: "crm" as const, label: "Customer CRM", icon: User },
          { id: "comms" as const, label: "Comms templates", icon: MessageSquare },
          { id: "audit" as const, label: "System Audits", icon: Clock }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <span>{item.label}</span>
              <Icon className="h-3.5 w-3.5 opacity-70" />
            </button>
          );
        })}

        {/* SLA widget */}
        <div className="border-t border-slate-100 pt-4 mt-4 px-3 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
            <span>SLA Monitoring</span>
            <span className={isSlaOverdue ? "text-red-500" : "text-blue-600"}>
              {isSlaOverdue ? "Overdue" : "On track"}
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-xs font-black text-slate-800">{slaRemainingHours} hrs</span>
            <span className="text-[10px] text-slate-400 font-semibold">Goal limit: 48h</span>
          </div>
        </div>
      </div>

      {/* Console Display Screen */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[480px] shadow-xs flex flex-col justify-between overflow-hidden">
        <div>
          
          {/* Sub-Tab content view */}
          {activeSubTab === "workflow" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="font-black text-slate-950 text-base">Application Workflow Timeline</h3>
                  <p className="text-xs text-slate-400 font-semibold">Change application workflow stages and audit histories.</p>
                </div>
                
                {/* Select Stage */}
                <select
                  value={currentStatus}
                  onChange={(e) => handleWorkflowStageChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {WORKFLOW_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Vertical workflow timeline visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
                <div className="relative border-l border-slate-100 ml-4 pl-8 space-y-6">
                  {WORKFLOW_STAGES.map((stage) => {
                    const isPassed = WORKFLOW_STAGES.findIndex((s) => s.id === currentStatus) >= WORKFLOW_STAGES.findIndex((s) => s.id === stage.id);
                    const isActive = currentStatus === stage.id;
                    return (
                      <div key={stage.id} className="relative group">
                        <div className={`absolute -left-[37px] top-1.5 rounded-full h-4 w-4 border flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-blue-600 border-blue-600 ring-4 ring-blue-50 text-white"
                            : isPassed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-slate-200 text-slate-300"
                        }`}>
                          {isPassed && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <h4 className={`text-xs font-black transition-colors ${isActive ? "text-blue-600" : isPassed ? "text-slate-800" : "text-slate-400"}`}>
                            {stage.label}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${stage.color}`}>
                            SLA: {stage.slaHours}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audit notes inside timeline */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 h-fit">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                    Timeline Logs
                  </h4>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar">
                    {auditLogs.slice(0, 3).map((log, idx) => (
                      <div key={idx} className="text-xs space-y-1">
                        <p className="font-extrabold text-slate-800">{log.action}</p>
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>{log.user}</span>
                          <span>{log.timestamp.split(",")[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "tasks" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-950 text-base">Internal Task Checklists</h3>
                <p className="text-xs text-slate-400 font-semibold">Generate, assign, and mark processing tasks to complete workflow.</p>
              </div>

              {/* Task list view */}
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      task.completed
                        ? "bg-slate-50/50 border-slate-150 text-slate-400"
                        : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleTaskCompletion(task.id)} className="cursor-pointer">
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <div className="h-5 w-5 border border-slate-300 rounded-lg hover:border-slate-400"></div>
                        )}
                      </button>
                      <div className="text-xs">
                        <p className={`font-bold ${task.completed ? "line-through" : ""}`}>{task.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Due: {task.dueDate} • Assignee: {task.assignedTo}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        task.priority === "high" ? "bg-red-50 text-red-600" : task.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => handleTaskDelete(task.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add task bar */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Task Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Call client for missing sign..."
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs w-full focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="w-full sm:w-[120px] space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as "low" | "medium" | "high")}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs w-full focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <button
                  onClick={handleAddNewTask}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>
          )}

          {activeSubTab === "approvals" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-950 text-base">Multi-Level Operations Approvals</h3>
                <p className="text-xs text-slate-400 font-semibold">Verify stage reports checklist across hierarchy segments.</p>
              </div>

              {/* Approval logs display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvals.map((app) => (
                  <div key={app.level} className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-extrabold text-xs text-slate-800">{app.level} Review</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        app.status === "approved" ? "bg-emerald-50 text-emerald-600" : app.status === "returned" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                      {app.approvedBy && (
                        <div className="flex justify-between">
                          <span>Evaluated By:</span>
                          <span>{app.approvedBy}</span>
                        </div>
                      )}
                      {app.remarks && (
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Remarks</p>
                          <p className="text-slate-800 mt-1 font-bold">{app.remarks}</p>
                        </div>
                      )}
                      {app.timestamp && (
                        <p className="text-[10px] text-slate-400 font-bold">{app.timestamp}</p>
                      )}
                    </div>

                    {app.status === "pending" && (
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => handleApprovalSubmit(app.level, "approved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Approve Release
                        </button>
                        <button
                          onClick={() => handleApprovalSubmit(app.level, "returned")}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Return Case
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Approval remarks block */}
              {approvals.some((a) => a.status === "pending") && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Review Remarks / Conditions</label>
                  <textarea
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                    placeholder="Enter approval criteria details or objection replies..."
                    rows={2}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs w-full focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {activeSubTab === "crm" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-950 text-base">Customer CRM Profiles</h3>
                <p className="text-xs text-slate-400 font-semibold">View client metadata logs, support tickets, and business parameters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-6">
                
                {/* CRM Profiles details */}
                <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-250 pb-2">
                    CRM Profile
                  </h4>
                  <div className="space-y-2.5 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Business:</span>
                      <span>{crmMetadata.businessDetails}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Family Members:</span>
                      <span>{crmMetadata.familyMembers.length} Members</span>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Customer Tags</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {crmMetadata.tags.map((tag) => (
                          <span key={tag} className="text-[9px] font-extrabold uppercase bg-slate-900 text-white px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support tickets related */}
                <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-250 pb-2">
                    Linked Support Tickets
                  </h4>
                  <div className="space-y-3">
                    {crmMetadata.tickets.map((t) => (
                      <div key={t.id} className="bg-white border border-slate-100 p-3 rounded-xl flex justify-between items-center text-xs shadow-xs">
                        <div>
                          <p className="font-black text-slate-800">{t.subject}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Ticket ID: {t.id} • Created {t.created_at}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          t.status === "resolved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "comms" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-950 text-base">Communication Center</h3>
                <p className="text-xs text-slate-400 font-semibold">Unified messaging triggers using auto-generated WhatsApp and SMS templates.</p>
              </div>

              <div className="space-y-4">
                {commTemplates.map((temp, index) => {
                  const filledBody = temp.body
                    .replace("{{CUSTOMER_NAME}}", customer.name)
                    .replace("{{SERVICE_NAME}}", serviceName)
                    .replace("{{APPLICATION_ID}}", applicationId.slice(0, 8));

                  return (
                    <div key={index} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            temp.type === "WhatsApp" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          }`}>
                            {temp.type} Template
                          </span>
                          <span className="text-xs font-bold text-slate-800">{temp.title}</span>
                        </div>
                        <button
                          onClick={() => handleTriggerCommsDispatch(temp)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Dispatch Alert</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed bg-white border border-slate-100 p-2.5 rounded-xl">
                        {filledBody}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSubTab === "audit" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-950 text-base">Immutable System Audits</h3>
                <p className="text-xs text-slate-400 font-semibold">Historical audit log tracing operators, timestamps, IP networks, and devices.</p>
              </div>

              <div className="overflow-x-auto no-scrollbar border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-150">
                      <th className="p-3.5">Action Event</th>
                      <th className="p-3.5">Operator</th>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">IP Address</th>
                      <th className="p-3.5">Device Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, index) => (
                      <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/50 last:border-b-0">
                        <td className="p-3.5 font-bold text-slate-900">{log.action}</td>
                        <td className="p-3.5 font-semibold text-slate-600">{log.user}</td>
                        <td className="p-3.5 font-semibold text-slate-500">{log.timestamp}</td>
                        <td className="p-3.5 font-mono text-slate-400">{log.ip}</td>
                        <td className="p-3.5 text-slate-500">{log.device}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Private Internal Pinned Notes box */}
        <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
          <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Private Internal Notes</span>
          </h4>

          {/* Notes display */}
          <div className="space-y-3">
            {internalNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-xl border text-xs leading-relaxed relative transition-all ${
                  note.pinned
                    ? "bg-amber-50/40 border-amber-200/60 shadow-xs"
                    : "bg-slate-50/30 border-slate-200/60"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-slate-800">{note.author}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{note.timestamp}</span>
                    <button
                      onClick={() => handlePinNote(note.id)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        note.pinned ? "text-amber-600 bg-amber-50" : "text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-600 font-semibold">{note.text}</p>
              </div>
            ))}
          </div>

          {/* New note input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write a private internal note (use @name to mention staff)..."
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs flex-1 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleAddNote}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 rounded-xl transition-all cursor-pointer"
            >
              Add Note
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
