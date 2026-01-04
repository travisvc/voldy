"use client";

import TaoIcon from "./TaoIcon";

interface PortfolioChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Calculate cumulative positions for stacked bar
  let cumulativePercent = 0;
  const segments = sortedData.map((item) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percentage;
    return {
      ...item,
      percentage,
      startPercent,
    };
  });

  return (
    <div className="space-y-2">
      {segments.map((item, index) => {
        return (
          <div
            key={index}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-[#161617] dark:text-zinc-100">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="font-semibold text-[#161617] dark:text-zinc-100 text-right flex items-baseline">
                <TaoIcon size="w-1.5 h-1.5" color="currentColor" />
                {item.value.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
      {/* Cumulative stacked progress bar */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden relative mt-2">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="h-full absolute transition-all duration-300"
            style={{
              left: `${segment.startPercent}%`,
              width: `${segment.percentage}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}
