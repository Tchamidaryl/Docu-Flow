import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT:               "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  PENDING:             "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  IN_REVIEW:           "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  APPROVED:            "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  REJECTED:            "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  REVISION_REQUESTED:  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

export const FILE_ICONS: Record<string, string> = {
  pdf:  "📄",
  docx: "📝",
  doc:  "📝",
  xlsx: "📊",
  xls:  "📊",
  png:  "🖼️",
  jpg:  "🖼️",
  jpeg: "🖼️",
};

export function getFileIcon(fileType?: string | null) {
  if (!fileType) return "📎";
  return FILE_ICONS[fileType.toLowerCase()] ?? "📎";
}

export function bytesToSize(bytes: number) {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
}
