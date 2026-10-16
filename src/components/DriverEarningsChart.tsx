import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { DailyEarning } from '../types';
import { TrendingUp, Calendar, DollarSign, Award } from 'lucide-react';

interface DriverEarningsChartProps {
  data: DailyEarning[];
  weekTotalLrd?: number;
}

// Custom tooltip with Monrovia Ride branding and LRD formatting
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item: DailyEarning = payload[0].payload;
    const isToday = item.day === 'Today';

    return (
      <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-1">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
          <span className="font-bold text-white flex items-center gap-1.5">
            <span>{item.day}</span>
            {isToday && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                Current
              </span>
            )}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">{item.date}</span>
        </div>

        <div className="pt-1 flex items-baseline justify-between gap-4">
          <span className="text-slate-400">Net Earnings:</span>
          <span className="text-sm font-extrabold text-amber-400 tabular-nums">
            {Number(item.earningsLrd).toLocaleString()} LRD
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
          <span>Trips Completed:</span>
          <span className="font-semibold text-white">{item.trips} trips</span>
        </div>
      </div>
    );
  }
  return null;
};

export const DriverEarningsChart: React.FC<DriverEarningsChartProps> = ({
  data = [],
  weekTotalLrd,
}) => {
  const totalLrd =
    weekTotalLrd ?? data.reduce((acc, curr) => acc + (Number(curr.earningsLrd) || 0), 0);
  const avgDailyLrd = data.length > 0 ? Math.round(totalLrd / data.length) : 0;
  const maxDay = data.reduce(
    (max, curr) => (curr.earningsLrd > max.earningsLrd ? curr : max),
    data[0] || { earningsLrd: 0, day: 'N/A' }
  );

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Weekly Earnings Breakdown</h2>
            <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 text-[11px] font-semibold">
              LRD
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily take-home payouts in Liberian Dollars across the past 7 days
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="block text-[11px] text-slate-400">Past 7 Days Total</span>
            <span className="text-base font-black text-amber-400 tabular-nums">
              {totalLrd.toLocaleString()} LRD
            </span>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-800" />
          <div className="hidden md:block text-right">
            <span className="block text-[11px] text-slate-400">Daily Average</span>
            <span className="text-sm font-bold text-white tabular-nums">
              {avgDailyLrd.toLocaleString()} LRD
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(val) =>
                val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `${val}`
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
            />
            <Bar
              dataKey="earningsLrd"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              animationDuration={800}
            >
              {data.map((entry, index) => {
                const isToday = entry.day === 'Today';
                const isPeak = entry.earningsLrd === maxDay.earningsLrd && entry.earningsLrd > 0;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isToday ? '#10b981' : isPeak ? '#f59e0b' : '#d97706'}
                    className="transition-all hover:opacity-85"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Meta */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span>Past Days (LRD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span>Today (Live)</span>
          </div>
        </div>

        {maxDay.earningsLrd > 0 && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Peak Day: <strong className="text-white">{maxDay.day}</strong> ({maxDay.earningsLrd.toLocaleString()} LRD)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
