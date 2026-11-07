import type { StatusTone } from "@/lib/admin/status-tone";

import type { EnquiryStatus } from "./types";

/** What each enquiry status means, in the admin panel's status colours. */
export function enquiryTone(status: EnquiryStatus): StatusTone {
  switch (status) {
    case "approved":
    case "won":
      return "success";
    case "quoted":
    case "contacted":
      return "info";
    case "new":
      return "warning";
    case "declined":
    case "lost":
      return "danger";
  }
}
