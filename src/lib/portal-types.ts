import type { ApplicationStatus, PaymentStatus } from "@/lib/portal-data";

export type LeadStatus = "new" | "in_progress" | "completed";

export type Lead = {
  id: string;
  name: string;
  mobile: string;
  service: string;
  message: string | null;
  status: LeadStatus;
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
  created_at: string;
};

export type PortalUser = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string | null;
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
  utr_number: string | null;
  screenshot_url: string | null;
  storage_path?: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  application_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
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
  user_id: string;
  service_slug: string;
  service_name: string;
  amount: number;
  form_data: Record<string, unknown> | null;
  status: ApplicationStatus;
  final_document_url: string | null;
  final_document_name: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  documents?: ApplicationDocument[];
  payments?: Payment[];
  invoices?: Invoice[];
  admin_notes?: AdminNote[];
  ratings?: Rating[];
  users?: PortalUser | null;
};
