import * as React from "react";
import { cn } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

// -------------------------------------------------------------
// 1. Premium Loading Skeletons
// -------------------------------------------------------------
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/80", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 space-y-4 animate-pulse">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. Empty States
// -------------------------------------------------------------
export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "🔍",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center max-w-lg mx-auto",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} variant="outline" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. Error State (No Stack Traces Leaked)
// -------------------------------------------------------------
export interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred while processing your request. Please try again.",
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-red-200 bg-red-50/50 p-8 text-center max-w-md mx-auto space-y-4",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl mx-auto text-red-600">
        ⚠️
      </div>
      <div>
        <h3 className="text-base font-bold text-red-950">{title}</h3>
        <p className="mt-1 text-xs text-red-700 leading-relaxed">{message}</p>
      </div>
      {retry && (
        <Button onClick={retry} variant="destructive" size="sm">
          Try Again
        </Button>
      )}
    </div>
  );
}
