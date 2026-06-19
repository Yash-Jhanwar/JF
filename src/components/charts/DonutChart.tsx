'use client';

import { useMemo } from 'react';

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export default function DonutChart({ data, size = 120 }: DonutChartProps) {
  const radius = 40;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const results: { label: string; value: number; color: string; dashArray: string; dashOffset: number }[] = [];
    let acc = 0;
    for (const d of data) {
      const percent = total > 0 ? d.value / total : 0;
      const dashArray = `${percent * circumference} ${circumference}`;
      const dashOffset = -acc * circumference;
      acc += percent;
      results.push({ ...d, dashArray, dashOffset });
    }
    return results;
  }, [data, circumference]);

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[var(--muted-foreground)]">{d.label}</span>
            <span className="font-semibold text-[var(--foreground)]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}