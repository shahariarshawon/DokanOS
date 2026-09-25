'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Store,
  RefreshCw,
  Calendar,
  Sparkles,
  Bot,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import {
  TimeRange,
  SellerDashboardResult,
  AdminDashboardResult,
  fetchSellerDashboard,
  fetchAdminDashboard,
} from '@/lib/analytics-api';
import { SellerDashboardView } from '@/components/analytics/seller-dashboard';
import { AdminDashboardView } from '@/components/analytics/admin-dashboard';

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<'seller' | 'admin'>('seller');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sellerData, setSellerData] = useState<SellerDashboardResult | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardResult | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  async function loadData(range: TimeRange = timeRange) {
    setIsLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetchSellerDashboard(range),
        fetchAdminDashboard(range),
      ]);
      setSellerData(sRes);
      setAdminData(aRes);
      setLastRefreshed(new Date());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              D
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                DokanOS <span className="text-zinc-500 font-normal">/ Analytics & BI</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links to AI / Commerce */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={() => loadData(timeRange)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-50 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Controls Bar: Tab Selector & Time Range */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 w-fit">
            <button
              onClick={() => setActiveTab('seller')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'seller'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" />
              Seller Dashboard
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Admin Intelligence
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl w-fit">
            <Calendar className="w-3.5 h-3.5 text-zinc-500 ml-2 mr-1 hidden sm:inline" />
            {(['7d', '30d', '90d', '1y'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeRange === r
                    ? 'bg-zinc-800 text-white font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Views */}
        {isLoading && !sellerData && !adminData ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-zinc-500">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Aggregating marketplace telemetry & BI data...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'seller' && sellerData && <SellerDashboardView data={sellerData} />}
            {activeTab === 'admin' && adminData && <AdminDashboardView data={adminData} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 px-6 text-center text-xs text-zinc-500">
        <p>DokanOS Phase 8 Analytics & Business Intelligence Engine • Real-time event tracking and telemetry pipeline</p>
      </footer>
    </div>
  );
}
