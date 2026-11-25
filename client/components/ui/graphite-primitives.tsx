"use client";

import React from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface GraphiteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const GraphiteCard: React.FC<GraphiteCardProps> = ({
  elevated = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] transition-colors",
        elevated ? "bg-[#1A1A1F]" : "bg-[#121215]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface GraphiteBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "subtle" | "outline";
}

export const GraphiteBadge: React.FC<GraphiteBadgeProps> = ({
  variant = "default",
  className,
  children,
  ...props
}) => {
  const styles =
    variant === "default"
      ? "bg-[#F4F4F5] text-[#09090B] font-semibold"
      : variant === "outline"
        ? "bg-transparent border border-white/15 text-[#D4D4D8]"
        : "bg-[#24242B] text-[#E4E4E7] border border-white/[0.07]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs tracking-tight",
        styles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

interface GraphiteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const GraphiteButton: React.FC<GraphiteButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => {
  const variantCls =
    variant === "primary"
      ? "bg-[#F4F4F5] text-[#09090B] hover:bg-white font-semibold shadow-[0_8px_24px_-6px_rgba(255,255,255,0.2)]"
      : variant === "secondary"
        ? "bg-[#1A1A1F] text-[#F4F4F5] border border-white/[0.12] hover:bg-[#24242B] font-medium"
        : "bg-transparent text-[#D4D4D8] hover:text-[#F4F4F5] hover:bg-white/[0.06] font-medium";

  const sizeCls =
    size === "sm"
      ? "min-h-[36px] px-3.5 py-1.5 text-xs rounded-xl"
      : size === "lg"
        ? "min-h-[46px] px-6 py-3 text-sm rounded-2xl"
        : "min-h-[40px] px-4.5 py-2 text-sm rounded-xl";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4F4F5]/70",
        variantCls,
        sizeCls,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

