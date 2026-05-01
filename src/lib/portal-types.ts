import type { ApplicationStatus, PaymentStatus } from "@/lib/portal-data";

export type LeadStatus = "new" | "in_progress" | "completed";

export type Lead = {
  id: string;
  name: string;
  customer_name?: string | null;
  mobile: string;
  service: string;
  city?: string | null;
  message: string | null;
  notes?: string | null;
  status: LeadStatus;
  agent_id?: string | null;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  storage_path: string | null;
  created_at: string;
};

export type AdminApplicationRow = {
  id: string;
  source: "application" | "lead";
  application_id: string | null;
  customer_name: string;
  mobile: string;
  service: string;
  message: string | null;
  uploaded_files: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    storage_path: string | null;
    document_type: string | null;
  }[];
  payment_status: string | null;
  invoice_status: string | null;
  application_status: string;
  agent_id?: string | null;
  agent_name?: string | null;
  payment_proof_url?: string | null;
  commission_amount?: number | null;
  commission_status?: string | null;
  created_at: string;
};

export type PortalUser = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string | null;
  mobile?: string | null;
  agent_code?: string | null;
  commission_type?: "fixed" | "percentage" | null;
  commission_value?: number | null;
  commission_rate?: number | null;
  active?: boolean | null;
  is_active?: boolean | null;
};

export type Customer = {
  id: string;
  user_id: string | null;
  created_by: string | null;
  assigned_agent_id: string | null;
  full_name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  source: "online" | "offline" | "agent_pos";
  created_at: string;
  updated_at: string;
};

export type ServiceCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;
  commission_amount: number;
  commission_rate: number | null;
  required_documents: string[] | null;
  active: boolean;
};

export type ApplicationDocument = {
  id: string;
  application_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  document_type: string;
  storage_path?: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  application_id: string;
  amount: number;
  status: PaymentStatus;
  screenshot_url: string | null;
  storage_path?: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  application_id: string;
  user_id?: string | null;
  customer_id?: string | null;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_mobile?: string | null;
  service_name: string;
  amount: number;
  payment_status: PaymentStatus;
  created_at: string;
};

export type AdminNote = {
  id: string;
  application_id: string;
  note: string;
  assigned_to: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  application_id: string | null;
  user_id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type Rating = {
  id: string;
  application_id: string;
  user_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
};

export type Application = {
  id: string;
  user_id: string | null;
  customer_id?: string | null;
  created_by?: string | null;
  assigned_agent_id?: string | null;
  assigned_staff_id?: string | null;
  service_id?: string | null;
  source?: "online" | "offline" | "agent_pos";
  service_slug: string;
  service_name: string;
  amount: number;
  form_data: Record<string, unknown> | null;
  status: ApplicationStatus;
  final_document_url: string | null;
  final_document_name: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  staff_note?: string | null;
  customer_message?: string | null;
  payment_status?: PaymentStatus;
  payment_screenshot_url?: string | null;
  payment_screenshot_path?: string | null;
  commission_amount?: number;
  submitted_by_role?: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer | null;
  documents?: ApplicationDocument[];
  payments?: Payment[];
  invoices?: Invoice[];
  commissions?: Commission[];
  admin_notes?: AdminNote[];
  ratings?: Rating[];
  users?: PortalUser | null;
};

export type Commission = {
  id: string;
  application_id: string;
  agent_id: string;
  service_id: string | null;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  applications?: Pick<Application, "id" | "service_name" | "amount" | "created_at"> | null;
  profiles?: Pick<PortalUser, "full_name" | "email" | "mobile"> | null;
};
