'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Eye,
  Percent,
  Download,
  Sparkles,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Award,
  ArrowUpRight,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  fetchSellerAnalytics,
  fetchProductAnalytics,
  fetchCustomerAnalytics,
  fetchAdminAnalytics,
  fetchAiInsights,
  generateAiInsights,
  dismissAiInsight,
  exportAnalyticsReport,
  SellerDashboardAnalytics,
  ProductAnalyticsData,
  CustomerAnalyticsData,
  AdminAnalyticsData,
  AiInsightData,
} from '@/lib/api-client';
import { formatPrice, getCategoryName } from '@/lib/utils';

interface AnalyticsDashboardProps {
  onNotify?: (message: string) => void;
  defaultStoreId?: string;
  isAdmin?: boolean;
}

export function AnalyticsDashboard({
  onNotify,
  defaultStoreId = 'store-apple-zone',
  isAdmin = false,
}: AnalyticsDashboardProps) {
  const [subSection, setSubSection] = useState<'overview' | 'products' | 'customers' | 'admin_bi'>(
    isAdmin ? 'admin_bi' : 'overview',
  );
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Data states
  const [sellerData, setSellerData] = useState<SellerDashboardAnalytics | null>(null);
  const [productData, setProductData] = useState<ProductAnalyticsData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalyticsData | null>(null);
  const [adminData, setAdminData] = useState<AdminAnalyticsData | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsightData[]>([]);

  const loadAllAnalytics = async () => {
    setIsLoading(true);
    try {
      const [seller, products, customers, admin, insights] = await Promise.all([
        fetchSellerAnalytics(timeRange, defaultStoreId),
        fetchProductAnalytics(timeRange, defaultStoreId),
        fetchCustomerAnalytics(timeRange, defaultStoreId),
        fetchAdminAnalytics(timeRange),
        fetchAiInsights(defaultStoreId),
      ]);
      setSellerData(seller);
      setProductData(products);
      setCustomerData(customers);
      setAdminData(admin);
      setAiInsights(insights);
    } catch {
      // Handled via mock fallbacks in api-client
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [timeRange, defaultStoreId]);

  const handleExport = async (type: 'sales' | 'products' | 'customers' | 'revenue') => {
    setIsExporting(true);
    try {
      const csv = await exportAnalyticsReport(type, timeRange, defaultStoreId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `dokanos_${type}_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify?.(`Exported ${type.toUpperCase()} report successfully`);
    } catch {
      onNotify?.('Export failed, please try again');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      const updated = await generateAiInsights(defaultStoreId);
      setAiInsights(updated);
      onNotify?.('AI Business Intelligence insights refreshed');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleDismissInsight = async (id: string) => {
    setAiInsights((prev) => prev.filter((i) => i.id !== id));
    await dismissAiInsight(id);
    onNotify?.('Insight dismissed');
  };

  // Customer Segmentation Colors
  const SEGMENT_COLORS = {
    HIGH_VALUE: '#4F46E5', // Indigo
    REGULAR: '#06B6D4', // Cyan
    NEW: '#10B981', // Emerald
  };

  const segmentationChartData = customerData?.segments
    ? [
        {
          name: 'High-Value VIPs',
          value: customerData.segments.highValueCount,
          color: SEGMENT_COLORS.HIGH_VALUE,
        },
        {
          name: 'Regular Buyers',
          value: customerData.segments.regularCount,
          color: SEGMENT_COLORS.REGULAR,
        },
        { name: 'New Customers', value: customerData.segments.newCount, color: SEGMENT_COLORS.NEW },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Commercial Analytics & Business Intelligence
            </h2>
            <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              Enterprise Intelligence
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Data pipeline telemetry, multi-dimensional cohort reporting, and automated AI growth
            insights.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200/80">
            {(['7d', '30d', '90d', '1y'] as const).map((r) => {
              const labels = { '7d': '7D', '30d': '30D', '90d': '90D', '1y': '1Y' };
              return (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    timeRange === r
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {labels[r]}
                </button>
              );
            })}
          </div>

          {/* Export Dropdown / Buttons */}
          <div className="relative group">
            <button
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isExporting ? 'Exporting...' : 'Export Reports'}</span>
            </button>
            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button
                onClick={() => handleExport('sales')}
                className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sales Orders CSV</span>
              </button>
              <button
                onClick={() => handleExport('products')}
                className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>Product Catalog CSV</span>
              </button>
              <button
                onClick={() => handleExport('customers')}
                className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Customer Cohort CSV</span>
              </button>
              <button
                onClick={() => handleExport('revenue')}
                className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span>Revenue Timeline CSV</span>
              </button>
            </div>
          </div>

          <button
            onClick={loadAllAnalytics}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors shadow-2xs"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-px text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setSubSection('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-all whitespace-nowrap ${
            subSection === 'overview'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Seller Sales & Funnel</span>
        </button>

        <button
          onClick={() => setSubSection('products')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-all whitespace-nowrap ${
            subSection === 'products'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Product Performance</span>
        </button>

        <button
          onClick={() => setSubSection('customers')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-all whitespace-nowrap ${
            subSection === 'customers'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Segmentation</span>
        </button>

        <button
          onClick={() => setSubSection('admin_bi')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-all whitespace-nowrap ${
            subSection === 'admin_bi'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Marketplace Admin BI</span>
        </button>
      </div>

      {/* PART 6: AI ANALYTICS INSIGHTS BANNER */}
      {aiInsights.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/30 to-white p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">
                    AI Business Intelligence Insights
                  </h3>
                  <span className="rounded-full bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                    Autonomous AI Layer
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Real-time pattern recognition across sales, dead-stock velocity, and repeat
                  buyers.
                </p>
              </div>
            </div>

            <button
              onClick={handleRegenerateAi}
              disabled={isGeneratingAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50/50 text-xs font-semibold text-indigo-700 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAi ? 'Synthesizing...' : 'Regenerate Insights'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {aiInsights.map((ins) => {
              const severityBadge =
                {
                  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
                  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
                  INFO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                }[ins.severity] || 'bg-zinc-50 text-zinc-700 border-zinc-200';

              return (
                <div
                  key={ins.id}
                  className="rounded-xl border border-white/90 bg-white/90 backdrop-blur-xs p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${severityBadge}`}
                      >
                        {ins.type}
                      </span>
                      <button
                        onClick={() => handleDismissInsight(ins.id)}
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Dismiss insight"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 leading-snug">{ins.title}</h4>
                    <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">
                      {ins.message}
                    </p>
                  </div>
                  {ins.metric && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                      <span>Target: {ins.metric}</span>
                      {ins.changeRate !== null && (
                        <span
                          className={`font-bold ${
                            Number(ins.changeRate) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {Number(ins.changeRate) >= 0
                            ? `+${ins.changeRate}%`
                            : `${ins.changeRate}%`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-SECTION 1: SELLER OVERVIEW & SALES PERFORMANCE */}
      {subSection === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Total Revenue
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {sellerData ? formatPrice(sellerData.metrics.totalSales) : '$48,920.00'}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>+{sellerData?.growth.revenueGrowthPct || 17.8}% vs prior period</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Total Orders
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {sellerData?.metrics.ordersCount || 142}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>+{sellerData?.growth.ordersGrowthPct || 12.1}% order volume</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Average Order Value
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {sellerData ? formatPrice(sellerData.metrics.averageOrderValue) : '$344.50'}
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Per completed customer order
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Conversion Rate
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {sellerData?.metrics.conversionRate || 3.4}%
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold block mt-1">
                {sellerData?.metrics.cartAdditions || 490} Cart Additions
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Shopper Views
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {sellerData?.metrics.totalViews || 4180}
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Storefront & product page impressions
              </span>
            </div>
          </div>

          {/* Charts: Sales Over Time & Order Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Sales & Revenue Timeline</h3>
                  <p className="text-xs text-zinc-500">
                    Gross sales vs net seller revenue over time
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span className="text-zinc-600">Gross Sales</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-zinc-600">Net Revenue</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sellerData?.timeline || []}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: any) => [`$${value}`, '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                      name="Gross Sales"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#revGrad)"
                      name="Net Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-zinc-900">Order Volume Trend</h3>
                <p className="text-xs text-zinc-500">Completed daily transaction orders</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sellerData?.timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 2: PRODUCT ANALYTICS & INVENTORY PERFORMANCE */}
      {subSection === 'products' && (
        <div className="space-y-6">
          {/* Top Selling Products Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Top Selling Products</h3>
                <p className="text-xs text-zinc-500">
                  Ranked by revenue velocity, units sold, and page-to-cart conversion rate
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                Avg Conversion: {productData?.averageConversionRate || 3.4}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Views</th>
                    <th className="py-3 px-4">Orders</th>
                    <th className="py-3 px-4">Conversion</th>
                    <th className="py-3 px-4">Total Revenue</th>
                    <th className="py-3 px-4">Inventory Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                  {productData?.topSelling.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="py-3.5 px-4 font-sans font-bold text-zinc-900">
                        {p.title}
                        {p.sku && (
                          <span className="block text-[10px] text-zinc-400 font-mono">{p.sku}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-zinc-600">
                        {getCategoryName(p.category)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {formatPrice(p.price)}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600">{p.views.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-900">
                        {p.unitsSold} units
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {p.conversionRate}%
                      </td>
                      <td className="py-3.5 px-4 font-black text-indigo-700">
                        {formatPrice(p.revenue)}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.inventoryStatus === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.inventoryStatus === 'LOW_STOCK'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.inventoryStatus.replace('_', ' ')} ({p.stock})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Performance & Slow Moving Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-zinc-900">Revenue by Category</h3>
                <p className="text-xs text-zinc-500">
                  Gross revenue breakdown across store product lines
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData?.categoryPerformance || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: any) => [`$${v}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#6366F1" radius={[0, 4, 4, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Low Performing & Dead Stock Alert */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-zinc-900">
                    Slow-Moving & Dead Stock Alert
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  Items holding excess inventory with low page views or zero conversion in 30 days
                </p>

                <div className="space-y-3">
                  {productData?.lowPerforming.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-zinc-900">{item.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                          <span>{item.views} Views</span>
                          <span>•</span>
                          <span>{item.unitsSold} Sold</span>
                          <span>•</span>
                          <span className="font-semibold text-rose-600">{item.stock} in stock</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Discount Rec.
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
                Tip: Bundling slow-moving accessories with top-tier phones or laptops increases
                sell-through by 32%.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: CUSTOMER ANALYTICS & SEGMENTATION */}
      {subSection === 'customers' && (
        <div className="space-y-6">
          {/* Customer KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Total Unique Buyers
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {customerData?.totalCustomers || 124}
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Verified consumer accounts
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Repeat Customer Rate
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {customerData?.returningRatePct || 37.1}%
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                {customerData?.returningCustomersCount || 46} returning customers
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Customer Lifetime Value (LTV)
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {customerData ? formatPrice(customerData.averageLifetimeValue) : '$394.50'}
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Average total spend per buyer
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Purchase Frequency
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {customerData?.averagePurchaseFrequency || 1.8}x
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Orders per active customer
              </span>
            </div>
          </div>

          {/* Segmentation Donut Chart & Cohort Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-zinc-900">Customer Segmentation</h3>
                <p className="text-xs text-zinc-500">Distribution across buyer value tiers</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentationChartData}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {segmentationChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span className="text-zinc-700 font-medium">High-Value VIPs ($300+)</span>
                  </div>
                  <span className="font-bold text-zinc-900">
                    {customerData?.segments.highValueCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                    <span className="text-zinc-700 font-medium">Regular Buyers (2+ orders)</span>
                  </div>
                  <span className="font-bold text-zinc-900">
                    {customerData?.segments.regularCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-zinc-700 font-medium">New Shoppers (1st order)</span>
                  </div>
                  <span className="font-bold text-zinc-900">{customerData?.segments.newCount}</span>
                </div>
              </div>
            </div>

            {/* Top VIP Customers Table */}
            <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Highest Value Customers</h3>
                  <p className="text-xs text-zinc-500">
                    Ranked by cumulative store spend and order frequency
                  </p>
                </div>
                <span className="text-xs font-semibold text-indigo-600">Top VIP Cohort</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Orders</th>
                      <th className="py-3 px-4">Average Order</th>
                      <th className="py-3 px-4">Total Spend</th>
                      <th className="py-3 px-4">Segment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                    {customerData?.topCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-4 font-sans font-bold text-zinc-900">
                          {c.name}
                          <span className="block text-[10px] text-zinc-400 font-sans">
                            {c.email}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 font-semibold">
                          {c.ordersCount} orders
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700">
                          {formatPrice(c.averageOrderValue)}
                        </td>
                        <td className="py-3.5 px-4 font-black text-indigo-700">
                          {formatPrice(c.totalSpent)}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.segment === 'HIGH_VALUE'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : c.segment === 'REGULAR'
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {c.segment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 4: ADMIN BUSINESS INTELLIGENCE DASHBOARD */}
      {subSection === 'admin_bi' && (
        <div className="space-y-6">
          {/* Admin Platform Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Platform GMV
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {adminData ? formatPrice(adminData.metrics.platformGmv) : '$184,320.00'}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>+{adminData?.growth.gmvGrowthPct || 18.6}% GMV Growth</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Platform Revenue
              </span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {adminData ? formatPrice(adminData.metrics.platformRevenue) : '$23,040.00'}
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Take-rate commissions (avg {adminData?.metrics.averageCommissionRate || 12.5}%)
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Active Merchants
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {adminData?.metrics.activeSellers || 260}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>+{adminData?.growth.sellerGrowthPct || 22.4}% seller growth</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Active Shoppers
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {adminData?.metrics.usersBreakdown.customers || 1140}
              </div>
              <span className="text-[11px] text-zinc-500 block mt-1">
                Across {adminData?.metrics.totalStores || 284} live stores
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Total Orders Fulfilled
              </span>
              <div className="text-2xl font-black text-zinc-900 mt-1">
                {adminData?.metrics.totalOrders.toLocaleString() || '3,120'}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                {adminData?.metrics.transactionsBreakdown.completed || 3720} Settled Payments
              </span>
            </div>
          </div>

          {/* Admin Charts: Marketplace GMV Growth & Platform Revenue */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Marketplace Growth & Platform Commission Trend
                </h3>
                <p className="text-xs text-zinc-500">
                  Total Gross Merchandise Value (GMV) vs platform transaction revenue
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span className="text-zinc-600">Platform GMV</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-600">Platform Commission</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adminData?.timeline || []}>
                  <defs>
                    <linearGradient id="adminGmv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="gmv"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#adminGmv)"
                    name="Marketplace GMV"
                  />
                  <Area
                    type="monotone"
                    dataKey="platformRevenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#adminRev)"
                    name="Platform Take"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Vendor Stores Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Top Performing Vendor Stores</h3>
                <p className="text-xs text-zinc-500">
                  Highest gross sales and platform commission contributors
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600">Merchant Leaderboard</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Store Name</th>
                    <th className="py-3 px-4">Merchant Business</th>
                    <th className="py-3 px-4">Total Orders</th>
                    <th className="py-3 px-4">Gross Sales</th>
                    <th className="py-3 px-4">Commission Paid</th>
                    <th className="py-3 px-4">Store Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                  {adminData?.topStores.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/50">
                      <td className="py-3.5 px-4 font-sans font-bold text-zinc-900">{s.name}</td>
                      <td className="py-3.5 px-4 font-sans text-zinc-600">
                        {s.sellerBusinessName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-800">
                        {s.orderCount} orders
                      </td>
                      <td className="py-3.5 px-4 font-black text-zinc-900">
                        {formatPrice(s.totalSales)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {formatPrice(s.commissionPaid)}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          ★ {s.rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
