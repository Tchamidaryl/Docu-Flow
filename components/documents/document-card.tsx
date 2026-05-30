import Link from "next/link";
import { formatDate, STATUS_COLORS, getFileIcon, cn } from "@/lib/utils";
import { FileText, Clock, User } from "lucide-react";

interface DocumentCardProps {
  doc: {
    id: string;
    title: string;
    status: string;
    fileType?: string | null;
    owner: { name: string };
    createdAt: Date | string;
    approvalSteps?: { status: string }[];
  };
  locale: string;
}

export function DocumentCard({ doc, locale }: DocumentCardProps) {
  const total = doc.approvalSteps?.length ?? 0;
  const done = doc.approvalSteps?.filter((s) => s.status === "APPROVED").length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      href={`/${locale}/documents/${doc.id}`}
      className="block group"
    >
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl flex-shrink-0">{doc.fileType ? getFileIcon(doc.fileType) : "📄"}</span>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {doc.title}
            </h3>
          </div>
          <span className={cn("flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[doc.status])}>
            {doc.status.replace("_", " ")}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.owner.name}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(doc.createdAt)}</span>
        </div>

        {total > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Approval progress</span>
              <span>{done}/{total}</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
