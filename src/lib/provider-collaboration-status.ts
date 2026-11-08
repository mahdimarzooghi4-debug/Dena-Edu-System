import type { ProviderCollaborationStatus } from "../server/provider/collaboration-contracts";
export function collaborationPhases(status: ProviderCollaborationStatus) {
  const institute = status === "requested" ? "در انتظار بررسی"
    : status === "withdrawn" ? "درخواست پس گرفته شده"
    : status === "institute_rejected" ? "ردشده" : "پذیرفته‌شده";
  const dena = status === "approved" ? "تأیید نهایی"
    : status === "dena_rejected" ? "ردشده"
    : status === "awaiting_dena" ? "در انتظار بررسی نهایی" : "هنوز به این مرحله نرسیده";
  return { institute, dena, approved: status === "approved" };
}
