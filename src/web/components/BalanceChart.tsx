"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  timestamp: number;
  total: number;
  free: number;
  alpha: number;
}

interface BalanceChartProps {
  data: ChartDataPoint[];
}

export default function BalanceChart({ data }: BalanceChartProps) {
  // Generate hour-aligned X-axis ticks for Recharts to select from
  const xTicks =
    data.length > 0
      ? (() => {
          const firstTimestamp = data[0].timestamp;
          const lastTimestamp = data[data.length - 1].timestamp;

          // Round to nearest hours
          const startHour = new Date(firstTimestamp);
          startHour.setMinutes(0, 0, 0);
          startHour.setHours(startHour.getHours() + 1); // First hour + 1

          const endHour = new Date(lastTimestamp);
          endHour.setMinutes(0, 0, 0);
          endHour.setHours(endHour.getHours() - 1); // Last hour - 1

          const ticks: number[] = [];
          let current = new Date(startHour);

          while (current.getTime() <= endHour.getTime()) {
            ticks.push(current.getTime());
            current = new Date(current.getTime() + 60 * 60 * 1000);
          }

          return ticks;
        })()
      : [];

  const xDomain =
    data.length > 0
      ? [data[0].timestamp, data[data.length - 1].timestamp]
      : ["dataMin", "dataMax"];

  // Generate evenly spaced rounded Y-axis ticks and domain with padding
  const { yTicks, yDomain } =
    data.length > 0
      ? (() => {
          const values = data.map((d) => d.total);
          const dataMin = Math.min(...values);
          const dataMax = Math.max(...values);
          const range = dataMax - dataMin;

          // Add padding (5% on each side)
          const padding = range * 0.05;
          const paddedMin = dataMin - padding;
          const paddedMax = dataMax + padding;

          // Calculate ideal number of ticks (aim for 5-8 ticks)
          const targetTicks = 6;
          const rawInterval = range / targetTicks;

          // Round to a standard interval (1, 2, 5, 10, 20, 50, 100, etc.)
          const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
          const normalized = rawInterval / magnitude;

          let intervalMultiplier: number;
          if (normalized <= 1) intervalMultiplier = 1;
          else if (normalized <= 2) intervalMultiplier = 2;
          else if (normalized <= 5) intervalMultiplier = 5;
          else intervalMultiplier = 10;

          const interval = intervalMultiplier * magnitude;

          // Round min down and max up to nearest interval
          const minTick = Math.floor(paddedMin / interval) * interval;
          const maxTick = Math.ceil(paddedMax / interval) * interval;

          const ticks: number[] = [];
          let current = minTick;

          while (current <= maxTick) {
            ticks.push(current);
            current += interval;
          }

          return {
            yTicks: ticks,
            yDomain: [paddedMin, paddedMax],
          };
        })()
      : { yTicks: [], yDomain: ["dataMin", "dataMax"] };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
      >
        {/* <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BCE5DD" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#BCE5DD" stopOpacity={0} />
          </linearGradient>
        </defs> */}
        <CartesianGrid stroke="currentColor" opacity={0.05} vertical={false} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={xDomain}
          height={40}
          ticks={xTicks}
          allowDataOverflow={false}
          tick={(props: any) => {
            const { x, y, payload } = props;
            const date = new Date(payload.value);

            return (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={0}
                  y={0}
                  dy={16}
                  textAnchor="middle"
                  className="fill-zinc-600 dark:fill-zinc-300"
                  fontSize={12}
                >
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </text>
                <text
                  x={0}
                  y={0}
                  dy={30}
                  textAnchor="middle"
                  className="fill-zinc-600 dark:fill-zinc-500"
                  fontSize={10}
                >
                  {date.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </text>
              </g>
            );
          }}
        />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          allowDecimals={false}
          width={40}
          tickFormatter={(value) => {
            return Math.round(value).toString();
          }}
          tick={(props: any) => {
            const { x, y, payload } = props;
            return (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={0}
                  y={0}
                  dy={2}
                  textAnchor="end"
                  className="fill-zinc-600 dark:fill-zinc-500"
                  fontSize={12}
                >
                  {Math.round(payload.value).toString()}
                </text>
              </g>
            );
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const date = new Date(data.timestamp);
              return (
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    {date.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                    {date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  <div className="space-y-1.5">
                    {payload.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                            {entry.name}:
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {typeof entry.value === "number"
                            ? entry.value.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })
                            : entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          fill="url(#balanceGradient)"
          stroke="none"
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#c1ced9"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
