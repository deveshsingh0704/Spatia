"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface GlassSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full saas-input px-3 py-2 text-xs flex items-center justify-between gap-2 text-left cursor-pointer transition-colors hover:bg-[var(--surface-overlay)] ${buttonClassName}`}
      >
        <span className="truncate font-medium text-[var(--foreground)]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--brand-accent)]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 z-50 rounded-2xl liquid-glass-elevated p-1.5 space-y-0.5 max-h-60 overflow-y-auto shadow-2xl"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={
                  isSelected
                    ? {
                        background: "var(--brand-accent-soft)",
                        color: "var(--brand-accent)"
                      }
                    : undefined
                }
                className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "font-semibold"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">{opt.label}</div>
                  {opt.description && (
                    <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                      {opt.description}
                    </div>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

