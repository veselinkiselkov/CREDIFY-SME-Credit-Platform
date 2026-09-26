"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DistributionBar } from "@/lib/analyst/list";

/**
 * How the book is spread across the five risk grades.
 *
 * FORM: five ordered categories, one measure - a bar chart, laid out HORIZONTALLY. With
 * labels as long as "Very High", horizontal bars keep every category name upright and
 * readable; a vertical chart would need rotated ticks, which are slower to read and take
 * more height than the whole chart is worth.
 *
 * COLOUR: the grade colours are the project's existing risk tokens, used here for exactly
 * the meaning they were reserved for. They are never the only signal - each bar is named on
 * the axis and carries its count as a direct label - so the chart still works in greyscale
 * and for colour-blind readers. Because the grades are an ordered severity scale rather
 * than unrelated categories, the ramp runs green to red in a fixed order that never changes
 * with the data.
 *
 * RESTRAINT: no gridlines, no axis rules, no legend (one series, and the title names it).
 * The bars and their numbers are the entire chart.
 */
interface CountLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
}

/** The count, drawn just past the end of its bar - including when the bar has no length. */
function CountLabel({ x = 0, y = 0, width = 0, height = 0, value = 0 }: CountLabelProps) {
  return (
    <text
      x={Number(x) + Number(width) + 8}
      y={Number(y) + Number(height) / 2}
      dominantBaseline="central"
      style={{ fill: "var(--foreground)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </text>
  );
}

export function RiskDistributionChart({ data }: { data: DistributionBar[] }) {
  const total = data.reduce((sum, bar) => sum + bar.count, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No scored applications yet. The distribution appears once an application with complete figures is submitted.
      </p>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 36, bottom: 4, left: 0 }}
          barCategoryGap={6}
        >
          {/* The value axis does the scaling but is never drawn: the direct labels carry it. */}
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 13,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
            formatter={(value) => {
              const count = Number(value);
              return [`${count} application${count === 1 ? "" : "s"}`, "Count"];
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((bar) => (
              <Cell key={bar.gradeId} fill={bar.colorVar} />
            ))}
            {/*
              Direct labels rather than a value axis: five numbers read faster than a scale.

              Drawn with a custom renderer because Recharts skips a label whose value is
              zero, which would leave an empty grade showing nothing at all instead of "0" -
              and "no applications in this band" is exactly the thing the chart should say
              out loud rather than by omission.
            */}
            <LabelList dataKey="count" content={<CountLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
