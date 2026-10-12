"use client";

import * as React from "react";
import { cn } from "./Typography";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (options: Omit<ToastMessage, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ type, title, description }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, description }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md animate-in slide-in-from-bottom-3 duration-150 transition-all",
              t.type === "success" && "bg-white/95 border-emerald-200 text-slate-900",
              t.type === "error" && "bg-white/95 border-red-200 text-slate-900",
              t.type === "warning" && "bg-white/95 border-amber-200 text-slate-900",
              t.type === "info" && "bg-white/95 border-blue-200 text-slate-900"
            )}
          >
            <span className="text-xl">
              {t.type === "success" && "✅"}
              {t.type === "error" && "⚠️"}
              {t.type === "warning" && "🔔"}
              {t.type === "info" && "ℹ️"}
            </span>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
              {t.description && (
                <p className="text-xs text-slate-600">{t.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
