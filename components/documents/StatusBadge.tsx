import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  DRAFT:               { label: "Draft",             className: "status-draft",    dot: "bg-gray-400" },
  PENDING_APPROVAL:    { label: "Pending Approval",  className: "status-pending",  dot: "bg-amber-400" },
  IN_REVIEW:           { label: "In Review",         className: "status-review",   dot: "bg-sky-400" },
  APPROVED:            { label: "Approved",          className: "status-approved", dot: "bg-emerald-400" },
  REJECTED:            { label: "Rejected",          className: "status-rejected", dot: "bg-red-400" },
  REVISION_REQUESTED:  { label: "Needs Revision",   className: "status-revision", dot: "bg-violet-400" },
  EXPIRED:             { label: "Expired",           className: "status-expired",  dot: "bg-orange-400" },
  CANCELLED:           { label: "Cancelled",         className: "status-cancelled",dot: "bg-gray-400" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["DRAFT"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", config.className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
