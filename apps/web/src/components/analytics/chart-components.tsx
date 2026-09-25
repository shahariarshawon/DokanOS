'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TimelineDataPoint, AdminTimelineDataPoint } from '@/lib/analytics-api';

interface RevenueAreaChartProps {
  data: TimelineDataPoint[];
}

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    shortDate: d.date.slice(5), // "MM-DD"
  }));

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.6} />
          <XAxis
            dataKey="shortDate"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
          />
          <Tooltip content={<CustomSalesTooltip />} />
          <Area
            type="monotone"
            dataKey="sales"
            name="Gross Sales"
            stroke="#6366f1"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#salesGrad)"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Net Revenue"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface OrdersTrafficBarChartProps {
  data: TimelineDataPoint[];
}

export function OrdersTrafficBarChart({ data }: OrdersTrafficBarChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    shortDate: d.date.slice(5),
  }));

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.6} />
          <XAxis
            dataKey="shortDate"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomOrdersTooltip />} />
          <Bar dataKey="orders" name="Completed Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PlatformGmvChartProps {
  data: AdminTimelineDataPoint[];
}

export function PlatformGmvChart({ data }: PlatformGmvChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    shortDate: d.date.slice(5),
  }));

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.6} />
          <XAxis
            dataKey="shortDate"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
          />
          <Tooltip content={<CustomAdminTooltip />} />
          <Area
            type="monotone"
            dataKey="gmv"
            name="Platform GMV"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#gmvGrad)"
          />
          <Area
            type="monotone"
            dataKey="platformRevenue"
            name="Net Commission"
            stroke="#f59e0b"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#commGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DistributionPieProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function DistributionPie({ data }: DistributionPieProps) {
  return (
    <div className="w-full h-[220px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              borderColor: '#3f3f46',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fff',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-zinc-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// -------------------------------------------------------------
// CUSTOM TOOLTIP RENDERERS
// -------------------------------------------------------------

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function CustomSalesTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const sales = payload.find((p) => p.dataKey === 'sales')?.value || 0;
    const rev = payload.find((p) => p.dataKey === 'revenue')?.value || 0;

    return (
      <div className="bg-zinc-900 border border-zinc-700/80 p-3 rounded-lg shadow-xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-semibold text-zinc-300">{label}</p>
        <p className="text-indigo-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          Gross Sales: <span className="font-mono font-medium">${sales.toLocaleString()}</span>
        </p>
        <p className="text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Net Payout: <span className="font-mono font-medium">${rev.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
}

function CustomOrdersTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const orders = payload[0]?.value || 0;
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-2.5 rounded-lg shadow-xl text-xs backdrop-blur-md">
        <p className="font-medium text-zinc-300">{label}</p>
        <p className="text-blue-400 font-mono mt-1 font-semibold">{orders} Orders Completed</p>
      </div>
    );
  }
  return null;
}

function CustomAdminTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const gmv = payload.find((p) => p.dataKey === 'gmv')?.value || 0;
    const comm = payload.find((p) => p.dataKey === 'platformRevenue')?.value || 0;

    return (
      <div className="bg-zinc-900 border border-zinc-700/80 p-3 rounded-lg shadow-xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-semibold text-zinc-300">{label}</p>
        <p className="text-blue-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Platform GMV: <span className="font-mono font-medium">${gmv.toLocaleString()}</span>
        </p>
        <p className="text-amber-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Platform Commission:{' '}
          <span className="font-mono font-medium">${comm.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
}
