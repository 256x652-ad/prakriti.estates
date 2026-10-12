"use client";

import * as React from "react";
import { cn } from "./Typography";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
}: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Swipeable / Draggable Bottom Sheet Sheet Body */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl border-t border-slate-200 transition-transform animate-in slide-in-from-bottom duration-200 space-y-4"
      >
        {/* Grab Handle */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 mb-2" />

        <div className="flex items-start justify-between">
          <div>
            {title && (
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
