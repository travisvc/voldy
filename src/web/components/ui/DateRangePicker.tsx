"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DateRange } from "../../types/data";

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return formatDateString(new Date());
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Convert Sunday=0 to Monday=0 format (Monday first)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Convert Sunday=0 to Monday=0 format for end padding
  const lastDayOfWeek = (lastDay.getDay() + 6) % 7;
  const endPadding = 6 - lastDayOfWeek;
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isDateInRange(
  date: Date,
  start: Date | null,
  end: Date | null
): boolean {
  if (!start || !end) return false;
  return date > start && date < end;
}

// Minimum allowed date: February 15, 2025
const MIN_DATE = new Date(2025, 1, 15); // Month is 0-indexed, so 1 = February
MIN_DATE.setHours(0, 0, 0, 0);
const MIN_DATE_STR = formatDateString(MIN_DATE);

function isAfterToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function isBeforeMinDate(date: Date): boolean {
  return date < MIN_DATE;
}

// Preset calculations - capped at today and min date
function capAtToday(dateStr: string): string {
  const todayStr = getTodayString();
  return dateStr > todayStr ? todayStr : dateStr;
}

function capAtMinDate(dateStr: string): string {
  return dateStr < MIN_DATE_STR ? MIN_DATE_STR : dateStr;
}

function getThisWeekRange(): DateRange {
  const now = new Date();
  // Convert to Monday-first week (Monday=0, Sunday=6)
  const dayOfWeek = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: capAtMinDate(formatDateString(start)),
    end: capAtToday(formatDateString(end)),
  };
}

function getLastWeekRange(): DateRange {
  const now = new Date();
  // Convert to Monday-first week (Monday=0, Sunday=6)
  const dayOfWeek = (now.getDay() + 6) % 7;
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - dayOfWeek);
  const start = new Date(thisWeekStart);
  start.setDate(thisWeekStart.getDate() - 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: capAtMinDate(formatDateString(start)),
    end: capAtToday(formatDateString(end)),
  };
}

function getLast30DaysRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start: capAtMinDate(formatDateString(start)),
    end: formatDateString(end),
  };
}

function getThisMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: capAtMinDate(formatDateString(start)),
    end: capAtToday(formatDateString(end)),
  };
}

function getLastMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: capAtMinDate(formatDateString(start)),
    end: capAtToday(formatDateString(end)),
  };
}

const presetOptions = [
  { label: "This Week", getRange: getThisWeekRange },
  { label: "Last Week", getRange: getLastWeekRange },
  { label: "This Month", getRange: getThisMonthRange },
  { label: "Last Month", getRange: getLastMonthRange },
  { label: "Last 30 Days", getRange: getLast30DaysRange },
];

interface RangeCalendarProps {
  startDate: string | null;
  endDate: string | null;
  onSelect: (date: string) => void;
  selectingStart: boolean;
  hoverDate: string | null;
  onHover: (date: string | null) => void;
}

function RangeCalendar({
  startDate,
  endDate,
  onSelect,
  selectingStart,
  hoverDate,
  onHover,
}: RangeCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const days = getDaysInMonth(viewYear, viewMonth);

  const startD = startDate ? new Date(startDate + "T00:00:00") : null;
  const endD = endDate ? new Date(endDate + "T00:00:00") : null;
  const hoverD = hoverDate ? new Date(hoverDate + "T00:00:00") : null;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isStart = (date: Date): boolean => {
    return startD ? isSameDay(date, startD) : false;
  };

  const isEnd = (date: Date): boolean => {
    return endD ? isSameDay(date, endD) : false;
  };

  const isInRange = (date: Date): boolean => {
    if (startD && endD) {
      return isDateInRange(date, startD, endD);
    }
    if (startD && hoverD && !endD && !selectingStart) {
      const rangeStart = startD < hoverD ? startD : hoverD;
      const rangeEnd = startD < hoverD ? hoverD : startD;
      return isDateInRange(date, rangeStart, rangeEnd);
    }
    return false;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === viewMonth;
  };

  const isToday = (date: Date): boolean => {
    return isSameDay(date, today);
  };

  const isDisabled = (date: Date): boolean => {
    return isAfterToday(date) || isBeforeMinDate(date);
  };

  return (
    <div>
      {/* Month/Year header */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#00112c]/60" />
        </button>
        <span className="text-sm font-semibold text-[#00112c] min-w-[130px] text-center">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-[#00112c]/60" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-[#00112c]/40 py-1 w-9"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((date, idx) => {
          const start = isStart(date);
          const end = isEnd(date);
          const inRange = isInRange(date);
          const currentMonth = isCurrentMonth(date);
          const todayDate = isToday(date);
          const disabled = isDisabled(date);

          return (
            <div
              key={idx}
              className="relative flex items-center justify-center"
            >
              {/* Range background */}
              {(inRange || (start && endD) || (end && startD)) && (
                <div
                  className={`absolute inset-y-0 bg-[#00112c]/10 ${
                    start ? "left-1/2 right-0 rounded-l-none" : ""
                  } ${end ? "right-1/2 left-0 rounded-r-none" : ""} ${
                    inRange ? "left-0 right-0" : ""
                  }`}
                />
              )}
              <button
                onClick={() => !disabled && onSelect(formatDateString(date))}
                onMouseEnter={() =>
                  !disabled && onHover(formatDateString(date))
                }
                onMouseLeave={() => onHover(null)}
                disabled={disabled}
                className={`
                  relative w-8 h-8 text-xs rounded-full transition-all cursor-pointer z-10
                  ${disabled ? "text-[#00112c]/20 cursor-not-allowed" : ""}
                  ${!currentMonth && !disabled ? "text-[#00112c]/30" : ""}
                  ${
                    currentMonth && !disabled && !start && !end
                      ? "text-[#00112c]"
                      : ""
                  }
                  ${start || end ? "bg-[#00112c] text-white font-medium" : ""}
                  ${!start && !end && !disabled ? "hover:bg-[#00112c]/10" : ""}
                  ${todayDate && !start && !end ? "font-semibold" : ""}
                `}
              >
                {date.getDate()}
                {todayDate && !start && !end && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00112c] rounded-full" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ dateRange, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(dateRange.start);
  const [tempEnd, setTempEnd] = useState<string | null>(dateRange.end);
  const [selectingStart, setSelectingStart] = useState(true);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
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

  useEffect(() => {
    setTempStart(dateRange.start);
    setTempEnd(dateRange.end);
  }, [dateRange]);

  const handleDateSelect = (date: string) => {
    if (selectingStart) {
      setTempStart(date);
      setTempEnd(null);
      setSelectingStart(false);
    } else {
      if (tempStart && date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
      setSelectingStart(true);
    }
  };

  const handlePresetClick = (getRange: () => DateRange) => {
    const range = getRange();
    setTempStart(range.start);
    setTempEnd(range.end);
    setSelectingStart(true);
  };

  const handleReset = () => {
    const range = getThisMonthRange();
    setTempStart(range.start);
    setTempEnd(range.end);
    setSelectingStart(true);
  };

  const handleApply = () => {
    if (tempStart && tempEnd && tempStart <= tempEnd) {
      onChange({ start: tempStart, end: tempEnd });
      setIsOpen(false);
    }
  };

  const getDisplayLabel = (): string => {
    return `${formatDisplayDate(dateRange.start)} – ${formatDisplayDate(
      dateRange.end
    )}`;
  };

  const isValidRange = tempStart && tempEnd && tempStart <= tempEnd;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#d3dae1] rounded-lg text-sm font-medium text-[#00112c] hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-[#00112c]/60" />
        <span className="max-w-[200px] truncate">{getDisplayLabel()}</span>
        <ChevronsUpDown className="w-4 h-4 text-[#00112c]/60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white border border-[#d3dae1] rounded-xl shadow-xl z-20 overflow-hidden">
          {/* Header with date range display */}
          <div className="px-5 pt-4 pb-3 border-b border-[#d3dae1]/50 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#00112c]/40 mb-1.5">
              Select Date Range
            </p>
            <p className="text-lg font-bold text-[#00112c]">
              {tempStart ? formatDisplayDate(tempStart) : "—"}
              <span className="text-[#00112c]/30 mx-2">–</span>
              <span
                className={tempEnd ? "text-[#00112c]" : "text-[#00112c]/30"}
              >
                {tempEnd ? formatDisplayDate(tempEnd) : "—"}
              </span>
            </p>
          </div>

          {/* Main content */}
          <div className="flex">
            {/* Preset options */}
            <div className="p-2 border-r border-[#d3dae1]/50 bg-[#f8f9fa]">
              <div className="flex flex-col gap-1 min-w-[110px]">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset.getRange)}
                    className="px-3 py-2 text-sm text-left text-[#00112c] hover:bg-[#00112c]/5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
                <div className="h-px bg-[#d3dae1]/50 my-1" />
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-sm text-left text-[#00112c]/50 hover:bg-[#00112c]/5 rounded-lg transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-3">
              <RangeCalendar
                startDate={tempStart}
                endDate={tempEnd}
                onSelect={handleDateSelect}
                selectingStart={selectingStart}
                hoverDate={hoverDate}
                onHover={setHoverDate}
              />
            </div>
          </div>

          {/* Apply button */}
          <div className="px-4 pb-4 pt-2 border-t border-[#d3dae1]/50">
            <button
              onClick={handleApply}
              disabled={!isValidRange}
              className="w-full py-2.5 bg-[#00112c] text-white text-sm font-medium rounded-lg hover:bg-[#00112c]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
