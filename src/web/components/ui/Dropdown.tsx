"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronsUpDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  label,
  icon,
  disabled = false,
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={twMerge(
          "flex items-center gap-2 px-4 py-2 bg-white border border-[#d3dae1] rounded-lg text-sm font-medium text-[#00112c] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer",
          className
        )}
      >
        {icon && <div>{icon}</div>}
        <div>{label || selectedOption?.label}</div>
        <div>
          <ChevronsUpDown className="w-4 h-4 text-[#00112c]/60" />
        </div>
      </button>
      {isOpen && (
        <div className="absolute space-y-1 right-0 mt-2 p-2 min-w-full bg-white border border-[#d3dae1] rounded-lg shadow-lg z-20">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg whitespace-nowrap cursor-pointer ${
                value === opt.value ? "bg-[#00112c]/5 font-medium" : ""
              }`}
            >
              {opt.description ? (
                <>
                  <p
                    className={`text-sm ${
                      value === opt.value ? "font-medium" : ""
                    } text-[#00112c]`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-[#00112c]/50">{opt.description}</p>
                </>
              ) : (
                opt.label
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type { DropdownOption, DropdownProps };
