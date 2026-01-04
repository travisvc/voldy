"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  copyable?: boolean;
  copyValue?: (row: T) => string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  title: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function Table<T>({
  columns,
  data,
  rowKey,
  title,
  onRowClick,
  loading = false,
  emptyMessage = "No data available",
}: TableProps<T>) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const handleCopy = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  return (
    <div className="bg-white rounded-lg border border-[#d3dae1] overflow-hidden">
      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-[#00112c]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-y border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#00112c]/60 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8">
                  <LoadingSpinner className="py-4" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`hover:bg-gray-100 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {col.copyable ? (
                        <div className="flex items-center gap-2">
                          {col.render(row)}
                          <div className="relative">
                            <button
                              onClick={(e) =>
                                handleCopy(
                                  col.copyValue
                                    ? col.copyValue(row)
                                    : String(col.render(row)),
                                  e
                                )
                              }
                              className="p-1 text-[#00112c]/40 hover:text-[#00112c] hover:bg-gray-100 rounded transition-colors"
                              title="Copy address"
                            >
                              {copiedValue ===
                              (col.copyValue
                                ? col.copyValue(row)
                                : String(col.render(row))) ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4 cursor-pointer" />
                              )}
                            </button>
                            {copiedValue ===
                              (col.copyValue
                                ? col.copyValue(row)
                                : String(col.render(row))) && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#00112c] text-white text-xs rounded whitespace-nowrap">
                                Address copied
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        col.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
