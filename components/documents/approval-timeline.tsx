import { formatDateTime } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface Step {
  id: string;
  order: number;
  status: string;
  comment?: string | null;
  actedAt?: Date | string | null;
  approver: { name: string; email: string };
  signature?: { imageData: string } | null;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  APPROVED:           <CheckCircle className="w-5 h-5 text-green-500" />,
  REJECTED:           <XCircle className="w-5 h-5 text-red-500" />,
  REVISION_REQUESTED: <RefreshCw className="w-5 h-5 text-orange-500" />,
  PENDING:            <Clock className="w-5 h-5 text-slate-400" />,
};

const STEP_COLORS: Record<string, string> = {
  APPROVED:           "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10",
  REJECTED:           "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10",
  REVISION_REQUESTED: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10",
  PENDING:            "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
};

export function ApprovalTimeline({ steps }: { steps: Step[] }) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      {sorted.map((step, index) => (
        <div key={step.id} className="flex gap-3">
          {/* Connector */}
          <div className="flex flex-col items-center">
            <div className="flex-shrink-0 mt-1">{STEP_ICONS[step.status] ?? STEP_ICONS.PENDING}</div>
            {index < sorted.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-2 mb-0 min-h-[16px]" />
            )}
          </div>

          {/* Card */}
          <div className={`flex-1 border rounded-xl p-4 mb-1 ${STEP_COLORS[step.status] ?? STEP_COLORS.PENDING}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Step {step.order}: {step.approver.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{step.approver.email}</p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {step.actedAt ? formatDateTime(step.actedAt) : "Awaiting"}
              </span>
            </div>

            {step.comment && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 italic border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                "{step.comment}"
              </p>
            )}

            {step.signature && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1">Digital Signature</p>
                <img
                  src={step.signature.imageData}
                  alt="Signature"
                  className="h-12 object-contain bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
