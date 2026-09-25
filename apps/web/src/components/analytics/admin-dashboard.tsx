'use client';

import React from 'react';
import {
  Users,
  Store,
  CreditCard,
  Building2,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  Star,
} from 'lucide-react';
import { AdminDashboardResult } from '@/lib/analytics-api';
import { PlatformGmvChart, DistributionPie } from './chart-components';

interface AdminDashboardViewProps {
  data: AdminDashboardResult;
}

export function AdminDashboardView({ data }: AdminDashboardViewProps) {
  const { metrics, growth, timeline, topStores } = data;

  const gatewayData = [
    { name: 'Stripe', value: metrics.gatewayBreakdown.stripe, color: '#6366f1' },
    { name: 'SSLCommerz', value: metrics.gatewayBreakdown.sslcommerz, color: '#06b6d4' },
  ];

  const transactionData = [
    { name: 'Completed', value: metrics.transactionsBreakdown.completed, color: '#10b981' },
    { name: 'Pending', value: metrics.transactionsBreakdown.pending, color: '#f59e0b' },
    { name: 'Failed', value: metrics.transactionsBreakdown.failed, color: '#ef4444' },
    { name: 'Refunded', value: metrics.transactionsBreakdown.refunded, color: '#a855f7' },
  ];

  return (
    <div className="space-y-8">
      {/* 1. TOP STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Platform GMV */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Platform GMV</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              ${metrics.platformGmv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <GrowthBadge pct={growth.gmvGrowthPct} />
          </div>
          <p className="text-xs text-zinc-500 mt-2">Gross Marketplace Volume</p>
        </div>

        {/* Card 2: Platform Revenue */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Platform Revenue</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-400 font-mono">
              ${metrics.platformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ~{metrics.averageCommissionRate.toFixed(1)}% take rate
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Marketplace commission earnings</p>
        </div>

        {/* Card 3: Total Users & Breakdown */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Users</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {metrics.totalUsers.toLocaleString()}
            </span>
            <GrowthBadge pct={growth.userGrowthPct} />
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
            <span className="text-zinc-300 font-mono">{metrics.usersBreakdown.customers}</span> shoppers •{' '}
            <span className="text-zinc-300 font-mono">{metrics.usersBreakdown.sellers}</span> sellers
          </div>
        </div>

        {/* Card 4: Active Sellers & Transactions */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Sellers</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 font-mono">
              {metrics.activeSellers.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400">{metrics.totalStores} stores total</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {metrics.totalOrders.toLocaleString()} orders completed in period
          </p>
        </div>
      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GMV Trajectory Chart (2 cols) */}
        <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Platform GMV & Net Revenue</h3>
              <p className="text-xs text-zinc-400">Gross marketplace transaction volume vs DokanOS commission</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Gross GMV
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Platform Commission
              </span>
            </div>
          </div>
          <PlatformGmvChart data={timeline} />
        </div>

        {/* Payment Gateway Breakdown (1 col) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Payment Gateways</h3>
            <p className="text-xs text-zinc-400">Transaction volume distribution</p>
          </div>
          <DistributionPie data={gatewayData} />
          <div className="border-t border-zinc-800 pt-3 text-xs flex justify-between text-zinc-400">
            <span>Stripe: {metrics.gatewayBreakdown.stripe}</span>
            <span>SSLCommerz: {metrics.gatewayBreakdown.sslcommerz}</span>
          </div>
        </div>
      </div>

      {/* 3. TRANSACTION STATUS & TOP STORES LEADERBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Status Breakdown (1 col) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Transaction Health</h3>
            <p className="text-xs text-zinc-400">Payment settlement statuses</p>
          </div>
          <DistributionPie data={transactionData} />
          <div className="border-t border-zinc-800 pt-3 text-xs grid grid-cols-2 gap-2 text-zinc-400">
            <span className="text-emerald-400 font-mono">Paid: {metrics.transactionsBreakdown.completed}</span>
            <span className="text-amber-400 font-mono">Pending: {metrics.transactionsBreakdown.pending}</span>
            <span className="text-rose-400 font-mono">Failed: {metrics.transactionsBreakdown.failed}</span>
            <span className="text-purple-400 font-mono">Refunded: {metrics.transactionsBreakdown.refunded}</span>
          </div>
        </div>

        {/* Top Stores Leaderboard (2 cols) */}
        <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Top Marketplace Merchant Stores</h3>
              <p className="text-xs text-zinc-400">Ranked by Gross Merchandise Value and platform revenue</p>
            </div>
            <Award className="w-5 h-5 text-amber-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 font-medium">Rank & Store</th>
                  <th className="pb-3 font-medium">Merchant Entity</th>
                  <th className="pb-3 font-medium">Total GMV</th>
                  <th className="pb-3 font-medium">Platform Fee</th>
                  <th className="pb-3 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {topStores.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700/80 text-zinc-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-white truncate max-w-[180px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-zinc-400">{s.sellerBusinessName}</td>
                    <td className="py-3 text-white font-mono font-semibold">
                      ${s.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-amber-400 font-mono font-medium">
                      ${s.commissionPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-amber-400 font-mono flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {s.rating.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
