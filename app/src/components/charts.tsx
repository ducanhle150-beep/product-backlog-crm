// Biểu đồ dùng chung. Màu categorical lấy từ palette dataviz (dark steps, đã validate trên surface #1d1d1d).
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Issue, Sprint } from '../data/types';
import { burndown, velocitySeries } from '../lib/metrics';

export const SERIES = { s1: '#3987e5', s2: '#d95926', ref: '#6b6b6b' };
const axis = { stroke: '#666', fontSize: 11, tickLine: false };
const tooltip = { contentStyle: { background: '#222', border: '1px solid #333', borderRadius: 6, fontSize: 12 }, labelStyle: { color: '#ebebeb' }, itemStyle: { color: '#d4d4d4' } };
const legend = { wrapperStyle: { fontSize: 12, color: '#b3b3b3' }, iconSize: 10 };

export function VelocityChart({ sprints, issues, height = 220 }: { sprints: Sprint[]; issues: Issue[]; height?: number }) {
  const data = velocitySeries(sprints, issues);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#262626" />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip {...tooltip} cursor={{ fill: '#ffffff08' }} />
        <Legend {...legend} />
        <Bar dataKey="committed" name="Committed" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="completed" name="Completed" fill={SERIES.s2} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BurndownChart({ sprint, issues, height = 220 }: { sprint: Sprint; issues: Issue[]; height?: number }) {
  const { rows } = burndown(sprint, issues, new Date());
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#262626" />
        <XAxis dataKey="day" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        <Line dataKey="ideal" name="Ideal" stroke={SERIES.ref} strokeDasharray="4 4" strokeWidth={2} dot={false} />
        <Line dataKey="remaining" name="Còn lại" stroke={SERIES.s1} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
        <Line dataKey="scope" name="Scope" stroke={SERIES.s2} strokeWidth={2} dot={false} type="stepAfter" connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
