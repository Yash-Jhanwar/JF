'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MiniPriceChartProps {
  data: number[];
  color?: string;
}

export default function MiniPriceChart({ data, color = '#166534' }: MiniPriceChartProps) {
  const chartData = data.map((price, i) => ({ idx: i, price }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Line
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}