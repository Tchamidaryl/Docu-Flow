"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({} as ToastContextValue);

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { ...opts, id }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: (title, message) => addToast({ type: "success", title, message }),
    error: (title, message) => addToast({ type: "error", title, message }),
    info: (title, message) => addToast({ type: "info", title, message }),
    warning: (title, message) => addToast({ type: "warning", title, message }),
  };

  const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const STYLES = {
    success: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800",
    error: "border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800",
    info: "border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800",
    warning: "border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800",
  };

  const ICON_STYLES = {
    success: "text-emerald-600",
    error: "text-red-600",
    info: "text-blue-600",
    warning: "text-amber-600",
  };

  return (
    <ToastContext.Provider value={ctx}>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto animate-slide-in-up",
                STYLES[toast.type]
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 shrink-0 mt-0.5", ICON_STYLES[toast.type])} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.message && <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
