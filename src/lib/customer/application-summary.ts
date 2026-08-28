import { resolveCustomerNextAction, type CustomerNextAction } from "@/lib/applications/customer-next-action";

/** The fields this module reads. Deliberately narrower than the full row. */
export type SummarisableApplication = {
  id: string;
  service_name: string;
  status: unknown;
  payment_status?: string | null;
  created_at: string;
  amount?: number;
  total_amount?: number | null;
};

export type ApplicationCounts = {
  total: number;
  /** Anything still moving: not completed, delivered, cancelled or refunded. */
  active: number;
  needsDocuments: number;
  needsPayment: number;
  completed: number;
};

const CLOSED = new Set(["completed", "delivered", "cancelled", "refunded"]);
const DONE = new Set(["completed", "delivered"]);
const DOCS = new Set(["documents_required", "document_pending"]);

function statusOf(application: SummarisableApplication): string {
  return String(application.status ?? "").toLowerCase();
}

export function countApplications(applications: SummarisableApplication[]): ApplicationCounts {
  let active = 0;
  let needsDocuments = 0;
  let needsPayment = 0;
  let completed = 0;

  for (const application of applications) {
    const status = statusOf(application);
    const payment = String(application.payment_status ?? "").toLowerCase();

    if (DONE.has(status)) completed += 1;
    if (!CLOSED.has(status)) active += 1;
    if (DOCS.has(status)) needsDocuments += 1;
    if (payment === "pending" || payment === "failed" || status === "payment_pending") needsPayment += 1;
  }

  return { total: applications.length, active, needsDocuments, needsPayment, completed };
}

export type CustomerTask = {
  applicationId: string;
  serviceName: string;
  action: CustomerNextAction;
  /**
   * The fee, when the task is a payment.
   *
   * A card that says only "Pay Now" under a service name is indistinguishable
   * from a navigation tab — which is exactly how the first version of this
   * screen was read. The amount is what makes it obviously a bill.
   */
  amount?: number;
  /** Lower sorts first. Money and blocked paperwork come before progress. */
  urgency: number;
};

/**
 * The "what needs you" list.
 *
 * The old home screen showed four counters and a list of recent applications,
 * which between them never answered the question a customer signs in with:
 * *is anything waiting on me?* Counting is not the same as telling. This turns
 * the same rows into a short list of things the customer can actually act on,
 * and returns an empty array when there is genuinely nothing — which is a
 * real, good answer and deserves to be shown as one.
 *
 * Ordering is by what it costs the customer to ignore it: an unpaid fee stalls
 * the filing outright, missing documents stall it at the next step, and a
 * reply to a query is somewhere in between.
 */
const URGENCY: Record<string, number> = {
  pay_now: 0,
  upload_documents: 1,
  view_respond: 2,
};

export function collectTasks(applications: SummarisableApplication[]): CustomerTask[] {
  const tasks: CustomerTask[] = [];

  for (const application of applications) {
    const status = statusOf(application);
    const action = resolveCustomerNextAction({
      applicationId: application.id,
      status: application.status,
      paymentStatus: application.payment_status,
      missingDocuments: DOCS.has(status),
    });

    const urgency = URGENCY[action.key];
    if (urgency === undefined) continue;

    const fee = application.total_amount ?? application.amount ?? 0;

    tasks.push({
      applicationId: application.id,
      serviceName: application.service_name,
      action,
      amount: action.key === "pay_now" && Number.isFinite(fee) && fee > 0 ? fee : undefined,
      urgency,
    });
  }

  return tasks.sort((a, b) => a.urgency - b.urgency || a.serviceName.localeCompare(b.serviceName));
}
