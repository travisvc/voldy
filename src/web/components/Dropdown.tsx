"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronsUpDown } from "lucide-react";

interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: DropdownOption[];
  className?: string;
}

export default function Dropdown({
  value,
  onChange,
  options,
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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full appearance-none bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm font-medium text-[#161617] dark:text-zinc-100 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#BCE5DD] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-between gap-2"
      >
        <span className="flex-1 text-left">
          {selectedOption?.label || "Select..."}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                option.value === value
                  ? "bg-[#BCE5DD] dark:bg-[#BCE5DD]/20 text-[#161617] dark:text-zinc-100"
                  : "text-[#161617] dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
