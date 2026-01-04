"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronsUpDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
  disabled?: boolean;
}

interface FilterGroup {
  label: string;
  values: string[];
}

interface MultiSelectPropsBase {
  options: MultiSelectOption[];
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  filterGroups?: FilterGroup[];
  onSelectGroup?: (values: string[]) => void;
}

interface MultiSelectPropsString extends MultiSelectPropsBase {
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
  valueType?: "string";
}

interface MultiSelectPropsNumber extends MultiSelectPropsBase {
  selectedValues: Set<number>;
  onToggle: (value: number) => void;
  valueType: "number";
}

type MultiSelectProps = MultiSelectPropsString | MultiSelectPropsNumber;

export function MultiSelect(props: MultiSelectProps) {
  const {
    options,
    selectedValues,
    onToggle,
    label,
    icon,
    disabled = false,
    className = "",
    valueType = "string",
    onSelectAll,
    onDeselectAll,
    filterGroups,
    onSelectGroup,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const isSelected = (value: string) => {
    if (valueType === "number") {
      return (selectedValues as Set<number>).has(Number(value));
    }
    return (selectedValues as Set<string>).has(value);
  };

  const handleToggle = (value: string) => {
    if (valueType === "number") {
      (onToggle as (v: number) => void)(Number(value));
    } else {
      (onToggle as (v: string) => void)(value);
    }
  };

  const hasQuickSelect =
    onSelectAll ||
    onDeselectAll ||
    (filterGroups && filterGroups.length > 0 && onSelectGroup);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={twMerge(
          "flex items-center gap-2 px-4 py-2 bg-white border border-[#d3dae1] rounded-lg text-sm font-medium text-[#00112c] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors",
          className
        )}
      >
        {icon}
        {label}
        <ChevronsUpDown className="w-4 h-4 text-[#00112c]/60" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 min-w-full bg-white border border-[#d3dae1] rounded-xl shadow-xl z-20 overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-[#d3dae1]/50 flex items-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#00112c]/40">
              Select Options ({selectedValues.size}/{options.length})
            </p>
          </div>

          {/* Main content */}
          <div className="flex">
            {/* Quick select sidebar */}
            {hasQuickSelect && (
              <div className="p-2 border-r border-[#d3dae1]/50 bg-[#f8f9fa]">
                <div className="flex flex-col gap-1 min-w-[90px]">
                  {onSelectAll && (
                    <button
                      onClick={onSelectAll}
                      className="px-3 py-2 text-sm text-left text-[#00112c] hover:bg-[#00112c]/5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      All
                    </button>
                  )}
                  {onDeselectAll && (
                    <button
                      onClick={onDeselectAll}
                      className="px-3 py-2 text-sm text-left text-[#00112c]/60 hover:bg-[#00112c]/5 hover:text-[#00112c] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      None
                    </button>
                  )}
                  {filterGroups && filterGroups.length > 0 && onSelectGroup && (
                    <>
                      <div className="h-px bg-[#d3dae1]/50 my-1" />
                      {filterGroups.map((group) => (
                        <button
                          key={group.label}
                          onClick={() => onSelectGroup(group.values)}
                          className="px-3 py-2 text-sm text-left text-[#00112c]/60 hover:bg-[#00112c]/5 hover:text-[#00112c] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {group.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="max-h-96 overflow-y-auto min-w-[200px] p-1 space-y-1">
              {/* Enabled options first */}
              {options
                .filter((opt) => !opt.disabled)
                .map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(opt.value)}
                      onChange={() => handleToggle(opt.value)}
                      className="w-4 h-4 rounded cursor-pointer accent-[#00112c]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#00112c] truncate">
                        {opt.label}
                      </p>
                      {opt.sublabel && (
                        <p className="text-xs text-[#00112c]/50 truncate">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                    {opt.group && (
                      <span className="text-[10px] font-medium text-[#00112c]/40 bg-[#00112c]/5 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {opt.group}
                      </span>
                    )}
                  </label>
                ))}
              {/* Disabled options (greyed out, at the bottom) */}
              {options.filter((opt) => opt.disabled).length > 0 && (
                <>
                  <div className="h-px bg-[#d3dae1]/50 mx-2 my-2" />
                  <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-wider text-[#00112c]/30">
                    Other chains
                  </p>
                  {options
                    .filter((opt) => opt.disabled)
                    .map((opt) => (
                      <div
                        key={opt.value}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg opacity-40 cursor-not-allowed"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected(opt.value)}
                          disabled
                          className="w-4 h-4 rounded cursor-not-allowed accent-[#00112c]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#00112c] truncate">
                            {opt.label}
                          </p>
                          {opt.sublabel && (
                            <p className="text-xs text-[#00112c]/50 truncate">
                              {opt.sublabel}
                            </p>
                          )}
                        </div>
                        {opt.group && (
                          <span className="text-[10px] font-medium text-[#00112c]/40 bg-[#00112c]/5 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {opt.group}
                          </span>
                        )}
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { MultiSelectOption, MultiSelectProps, FilterGroup };
