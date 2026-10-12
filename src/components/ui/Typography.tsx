import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const typographyVariants = cva("text-slate-900 transition-colors", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b border-slate-200 pb-2 text-3xl font-bold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-bold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-4 text-slate-700",
      blockquote: "mt-6 border-l-2 border-emerald-600 pl-6 italic text-slate-700",
      lead: "text-xl text-slate-600",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none text-slate-600",
      muted: "text-xs text-slate-500",
      stat: "font-mono text-3xl font-black text-slate-900",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    const Component =
      as ||
      (variant === "h1"
        ? "h1"
        : variant === "h2"
        ? "h2"
        : variant === "h3"
        ? "h3"
        : variant === "h4"
        ? "h4"
        : variant === "blockquote"
        ? "blockquote"
        : "p");

    return (
      <Component
        ref={ref}
        className={cn(typographyVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Typography.displayName = "Typography";
