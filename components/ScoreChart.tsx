"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/cn";
import { TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ScoreDataPoint {
  /** ISO date string or human-readable label */
  date: string;
  /** Numeric score value */
  score: number;
}

export interface ScoreChartProps {
  /** Array of { date, score } data points */
  data: ScoreDataPoint[];
  /** Chart title */
  title?: string;
  /** Minimum value of the Y axis (auto-calculated if omitted) */
  yMin?: number;
  /** Maximum value of the Y axis (auto-calculated if omitted) */
  yMax?: number;
  /** Color of the trend line */
  lineColor?: string;
  /** Whether to show the average reference line */
  showAverage?: boolean;
  /** Additional class names */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

function CustomTooltip({
  active,
  payload,
  label,
  t,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  t: (key: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg shadow-gray-950/5">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900 tabular-nums">
        {t("scorechart.score")}: {payload[0].value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ScoreChart                                                         */
/* ------------------------------------------------------------------ */

export function ScoreChart({
  data,
  title,
  yMin,
  yMax,
  lineColor = "#3b6df0",
  showAverage = true,
  className,
}: ScoreChartProps) {
  const { t } = useLanguage();
  const displayTitle = title ?? t("scorechart.title");

  /* ---- Compute average ---- */
  const average = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + d.score, 0);
    return Math.round((sum / data.length) * 100) / 100;
  }, [data]);

  /* ---- Auto-calculate Y domain with padding ---- */
  const computedYMin = yMin ?? (() => {
    if (data.length === 0) return 0;
    const min = Math.min(...data.map((d) => d.score));
    return Math.floor(min - (min * 0.1));
  })();

  const computedYMax = yMax ?? (() => {
    if (data.length === 0) return 100;
    const max = Math.max(...data.map((d) => d.score));
    return Math.ceil(max + (max * 0.1));
  })();

  /* ---- Empty state ---- */
  if (data.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12", className)}>
        <TrendingUp className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">{t("scorechart.noData")}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden", className)}>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-[15px] h-[15px] text-brand-500" />
          <span className="text-sm font-medium text-gray-700">{displayTitle}</span>
        </div>
        {showAverage && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{t("scorechart.avg")}:</span>
            <span className="font-semibold text-gray-600 tabular-nums">{average}</span>
          </div>
        )}
      </div>

      {/* ---- Chart ---- */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              dy={8}
            />
            <YAxis
              domain={[computedYMin, computedYMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              width={40}
            />
            <Tooltip content={<CustomTooltip t={t} />} />

            {/* Average reference line */}
            {showAverage && (
              <ReferenceLine
                y={average}
                stroke="#94a3b8"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `${t("scorechart.avg")}: ${average}`,
                  position: "insideBottomRight",
                  fontSize: 11,
                  fill: "#94a3b8",
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: "#fff",
                stroke: lineColor,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: lineColor,
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
