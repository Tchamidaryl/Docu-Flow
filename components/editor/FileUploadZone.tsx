"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText, FileSpreadsheet, Image, File, X, Upload,
  CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FileUploadZoneProps {
  documentId: string;
  onUploadComplete?: (file: any) => void;
  maxFiles?: number;
  existingFiles?: any[];
}

const FILE_ICONS: Record<string, any> = {
  "application/pdf":                { icon: FileText, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30", label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", label: "DOCX" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", label: "XLSX" },
  "application/msword": { icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", label: "DOC" },
};

function getFileIcon(mimeType: string) {
  return FILE_ICONS[mimeType] ?? { icon: File, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-800", label: "FILE" };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export default function FileUploadZone({
  documentId,
  onUploadComplete,
  maxFiles = 5,
  existingFiles = [],
}: FileUploadZoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(async (file: File) => {
    setUploadingFiles((prev) => [...prev, { file, progress: 0, status: "uploading" }]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentId", documentId);

    try {
      // Simulate progress (real implementation would use XHR or fetch with streams)
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadingFiles((prev) =>
            prev.map((f) => f.file === file ? { ...f, progress: pct } : f)
          );
        }
      });

      const result = await new Promise<any>((resolve, reject) => {
        xhr.open("POST", `/api/v1/documents/${documentId}/files`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });

      setUploadingFiles((prev) =>
        prev.map((f) => f.file === file ? { ...f, progress: 100, status: "done" } : f)
      );
      onUploadComplete?.(result.data);
    } catch (err: any) {
      setUploadingFiles((prev) =>
        prev.map((f) => f.file === file ? { ...f, status: "error", error: err.message } : f)
      );
    }
  }, [documentId, onUploadComplete]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/msword": [".doc"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
  });

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            isDragActive ? "bg-primary/20" : "bg-muted"
          )}>
            <Upload className={cn("w-6 h-6", isDragActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isDragActive ? "Drop files here…" : "Drag & drop files, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, XLSX, images — up to 50MB each
            </p>
          </div>
        </div>
      </div>

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uf, i) => {
            const { icon: Icon, color, bg, label } = getFileIcon(uf.file.type);
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{uf.file.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{formatBytes(uf.file.size)}</span>
                  </div>
                  {uf.status === "uploading" && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                  )}
                  {uf.status === "done" && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Upload complete
                    </p>
                  )}
                  {uf.status === "error" && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {uf.error ?? "Upload failed"}
                    </p>
                  )}
                </div>
                {uf.status === "uploading" && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attached Files</p>
          {existingFiles.map((f) => {
            const { icon: Icon, color, bg, label } = getFileIcon(f.mimeType);
            return (
              <a
                key={f.id}
                href={f.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{f.originalName}</p>
                  <p className="text-xs text-muted-foreground">{label} · {formatBytes(f.sizeBytes)}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
