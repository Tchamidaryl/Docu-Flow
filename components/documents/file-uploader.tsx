"use client";
import { useCallback, useState } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { cn, bytesToSize, getFileIcon } from "@/lib/utils";
import { useTranslations } from "next-intl";

const ACCEPTED = ".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface FileUploaderProps {
  onUpload: (file: File) => void;
  uploadedFileName?: string | null;
  onRemove?: () => void;
  uploading?: boolean;
}

export function FileUploader({ onUpload, uploadedFileName, onRemove, uploading }: FileUploaderProps) {
  const t = useTranslations("newDocument");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File) => {
    if (file.size > MAX_BYTES) { setError("File exceeds 10 MB limit"); return false; }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["pdf", "docx", "doc", "xlsx", "xls", "png", "jpg", "jpeg"];
    if (!allowed.includes(ext)) { setError("Unsupported file type"); return false; }
    setError(null);
    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validate(file)) onUpload(file);
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  if (uploadedFileName) {
    const ext = uploadedFileName.split(".").pop() ?? "";
    return (
      <div className="flex items-center gap-3 p-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800">
        <span className="text-2xl">{getFileIcon(ext)}</span>
        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{uploadedFileName}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <label
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all",
          dragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10"
            : "border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        )}
      >
        <input type="file" accept={ACCEPTED} className="hidden" onChange={onInput} disabled={uploading} />
        <UploadCloud className={cn("w-10 h-10", dragActive ? "text-brand-500" : "text-slate-400")} />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {uploading ? "Uploading..." : t("dragDrop")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("supportedFormats")}</p>
        </div>
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
