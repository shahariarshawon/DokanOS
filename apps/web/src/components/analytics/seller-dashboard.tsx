'use client';

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Percent,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SellerDashboardResult } from '@/lib/analytics-api';
import { RevenueAreaChart, OrdersTrafficBarChart } from './chart-components';

interface SellerDashboardViewProps {
  data: SellerDashboardResult;
}

export function SellerDashboardView({ data }: SellerDashboardViewProps) {
  const { metrics, growth, timeline, topProducts, recentActivity } = data;

  return (
    <div className="space-y-8">
      {/* 1. TOP STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Sales</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              ${metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <GrowthBadge pct={growth.salesGrowthPct} />
          </div>
          <p className="text-xs text-zinc-500 mt-2">Gross customer transaction total</p>
        </div>

        {/* Card 2: Net Revenue */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Net Revenue</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 font-mono">
              ${metrics.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <GrowthBadge pct={growth.revenueGrowthPct} />
          </div>
          <p className="text-xs text-zinc-500 mt-2">Vendor payout after platform fee</p>
        </div>

        {/* Card 3: Orders & AOV */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Orders & Items</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {metrics.ordersCount.toLocaleString()}
            </span>
            <GrowthBadge pct={growth.ordersGrowthPct} />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
            <span>AOV: <strong className="text-zinc-200 font-mono">${metrics.averageOrderValue.toFixed(2)}</strong></span>
            <span>Items: <strong className="text-zinc-200 font-mono">{metrics.itemsSoldCount}</strong></span>
          </div>
        </div>

        {/* Card 4: Conversion Rate & Traffic */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Conversion Rate</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-400 font-mono">
              {metrics.conversionRate.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              {metrics.totalViews.toLocaleString()} views
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {metrics.cartAdditions.toLocaleString()} cart additions tracked
          </p>
        </div>
      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Revenue Chart (2 cols) */}
        <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Sales & Revenue Trajectory</h3>
              <p className="text-xs text-zinc-400">Daily gross sales vs net merchant payout</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Gross Sales
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Net Revenue
              </span>
            </div>
          </div>
          <RevenueAreaChart data={timeline} />
        </div>

        {/* Orders Bar Chart (1 col) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Order Volume</h3>
            <p className="text-xs text-zinc-400">Completed daily order count</p>
          </div>
          <OrdersTrafficBarChart data={timeline} />
        </div>
      </div>

      {/* 3. BOTTOM ROW: TOP PRODUCTS & CUSTOMER ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products Table (2 cols) */}
        <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Top Performing Products</h3>
              <p className="text-xs text-zinc-400">Ranked by revenue contribution and units sold</p>
            </div>
            <span className="text-xs text-indigo-400 font-medium">Top {topProducts.length} Items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Units Sold</th>
                  <th className="pb-3 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Stock</th>
                  <th className="pb-3 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {topProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-400">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="truncate max-w-[220px]">
                          <p className="font-medium text-white truncate">{p.title}</p>
                          <p className="text-[11px] text-zinc-500 font-mono">{p.sku || `SKU-0${idx + 1}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-zinc-300 font-mono font-medium">{p.unitsSold}</td>
                    <td className="py-3 text-emerald-400 font-mono font-semibold">
                      ${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          p.stock > 10
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-3 text-amber-400 font-mono flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {p.rating.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Activity Feed (1 col) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Customer Activity</h3>
              <p className="text-xs text-zinc-400">Live order & purchase stream</p>
            </div>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>

          <div className="space-y-3.5">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:border-zinc-700/80 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-blue-500/10 text-blue-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{act.customerName}</p>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[150px]">
                      {act.productTitle || 'Marketplace Item'}
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      {formatTimeAgo(act.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {act.amount !== null && (
                    <span className="font-mono font-semibold text-emerald-400 block">
                      ${act.amount.toFixed(2)}
                    </span>
                  )}
                  <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300 uppercase tracking-wider">
                    {act.status || 'PAID'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number }) {
  const isPos = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isPos
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`}
    >
      {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isPos ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
    </span>
  );
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
