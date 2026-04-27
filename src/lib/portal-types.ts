import type { ApplicationStatus, PaymentStatus } from "@/lib/portal-data";

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
  created_at: string;
};

export type Payment = {
  id: string;
  application_id: string;
  amount: number;
  status: PaymentStatus;
  utr_number: string | null;
  screenshot_url: string | null;
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
  form_data: Record<string, string>;
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
