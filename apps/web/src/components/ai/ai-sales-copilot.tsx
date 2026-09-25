'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Brain,
  Search,
  ShieldAlert,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Tag,
  ArrowRight,
  RefreshCw,
  Edit3,
  Check,
  Flame,
  HelpCircle,
} from 'lucide-react';
import {
  askSellerSalesAssistant,
  generateProductOptimization,
  applyProductOptimization,
  fetchFlaggedFraudOrders,
  runAiAutomation,
  SellerSalesAssistantResponse,
  ProductOptimizationResult,
  FraudRiskAssessment,
  AiAutomationResult,
  fetchProducts,
} from '@/lib/api-client';
import { Product } from '@/lib/mock-data';
import { formatPrice, getCategoryName } from '@/lib/utils';

export function AISalesCopilot() {
  const [activeTab, setActiveTab] = useState<'sales' | 'optimizer' | 'fraud' | 'automation'>(
    'sales',
  );

  // Sales Assistant state
  const [salesQuestion, setSalesQuestion] = useState('Why are my sales dropping this month?');
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesResult, setSalesResult] = useState<SellerSalesAssistantResponse | null>(null);

  // Product Optimizer state
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState<ProductOptimizationResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Fraud Assessment state
  const [fraudOrders, setFraudOrders] = useState<FraudRiskAssessment[]>([]);
  const [fraudLoading, setFraudLoading] = useState(false);

  // Background Automation state
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResult, setAutoResult] = useState<AiAutomationResult | null>(null);

  useEffect(() => {
    fetchProducts().then((res) => {
      if (res.data && res.data.length > 0) {
        setProducts(res.data);
        setSelectedProductId(res.data[0].id);
      }
    });

    // Initial load for sales assistant
    handleAskAssistant('Why are my sales dropping this month?');
    loadFraudOrders();
  }, []);

  const handleAskAssistant = async (queryText?: string) => {
    const q = queryText || salesQuestion;
    if (!q.trim() || salesLoading) return;
    setSalesLoading(true);
    try {
      const res = await askSellerSalesAssistant(q);
      setSalesResult(res);
    } catch {
      // Handled in client fallback
    } finally {
      setSalesLoading(false);
    }
  };

  const handleRunOptimizer = async () => {
    if (!selectedProductId || optLoading) return;
    setOptLoading(true);
    setAppliedSuccess(false);
    try {
      const res = await generateProductOptimization(selectedProductId);
      setOptResult(res);
      setEditTitle(res.optimizedTitle);
      setEditDescription(res.optimizedDescription);
    } catch {
      // Handled
    } finally {
      setOptLoading(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!selectedProductId || !optResult) return;
    setOptLoading(true);
    try {
      await applyProductOptimization(selectedProductId, {
        title: isEditing ? editTitle : optResult.optimizedTitle,
        description: isEditing ? editDescription : optResult.optimizedDescription,
        seoKeywords: optResult.seoKeywords,
        tags: optResult.tags,
        metaTitle: optResult.metaTitle,
        metaDescription: optResult.metaDescription,
      });
      setAppliedSuccess(true);
      setIsEditing(false);
      // update local product list
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProductId
            ? { ...p, title: isEditing ? editTitle : optResult.optimizedTitle }
            : p,
        ),
      );
    } catch {
      // Handled
    } finally {
      setOptLoading(false);
    }
  };

  const loadFraudOrders = async () => {
    setFraudLoading(true);
    try {
      const orders = await fetchFlaggedFraudOrders();
      setFraudOrders(orders);
    } catch {
      // Handled
    } finally {
      setFraudLoading(false);
    }
  };

  const handleRunAutomation = async (task: string = 'ALL') => {
    setAutoLoading(true);
    try {
      const res = await runAiAutomation(task);
      setAutoResult(res);
    } catch {
      // Handled
    } finally {
      setAutoLoading(false);
    }
  };

  const quickPrompts = [
    'Why are my sales dropping this month?',
    'Which products have high views but low purchases?',
    'What pricing strategy should I adopt for weekend traffic?',
    'How can I improve my store conversion rate to 5%?',
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-400/30">
              <Brain className="w-5 h-5 text-indigo-300" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Autonomous Intelligence Engine
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">AI Commerce Copilot & Automation</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Proactively optimizes sales conversion, crafts high-converting copy, flags suspicious
            transactions, and manages autonomous background commerce jobs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunAutomation('ALL')}
            disabled={autoLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Zap className={`w-4 h-4 ${autoLoading ? 'animate-spin' : ''}`} />
            {autoLoading ? 'Running Jobs...' : 'Trigger Background Automations'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-slate-50/70 px-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sales'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Sales Intelligence Assistant
        </button>
        <button
          onClick={() => setActiveTab('optimizer')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'optimizer'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Automated Product Optimizer
        </button>
        <button
          onClick={() => setActiveTab('fraud')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'fraud'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Fraud Risk Detection ({fraudOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('automation')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'automation'
              ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          Redis Queue Automations
        </button>
      </div>

      {/* Tab 1: Sales Assistant */}
      {activeTab === 'sales' && (
        <div className="p-6 space-y-6">
          {/* Query Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Ask Seller Sales Assistant
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={salesQuestion}
                onChange={(e) => setSalesQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
                placeholder="Ask e.g. Why are my sales dropping? or How can I boost conversion?"
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleAskAssistant()}
                disabled={salesLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {salesLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze
              </button>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSalesQuestion(prompt);
                    handleAskAssistant(prompt);
                  }}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-gray-600 transition-colors cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          {/* Results Display */}
          {salesResult && (
            <div className="space-y-6">
              {/* Diagnostics Card */}
              <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                  <TrendingDown className="w-6 h-6 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-gray-900 mb-1">
                    AI Sales Diagnostic & Pattern Findings
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{salesResult.diagnostics}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-amber-200/60">
                    <div>
                      <span className="text-xs text-gray-500 block">Current Cycle</span>
                      <span className="text-base font-bold text-gray-900">
                        {formatPrice(salesResult.salesTrend.currentRevenue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Previous Cycle</span>
                      <span className="text-base font-bold text-gray-500">
                        {formatPrice(salesResult.salesTrend.previousRevenue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Trajectory</span>
                      <span
                        className={`text-base font-bold ${
                          salesResult.salesTrend.percentChange >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {salesResult.salesTrend.percentChange}%
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Store Conversion</span>
                      <span className="text-base font-bold text-indigo-700">
                        {salesResult.salesTrend.conversionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Marketing */}
                <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    <h5 className="font-semibold text-gray-900 text-sm">Marketing Suggestions</h5>
                  </div>
                  <ul className="space-y-2.5">
                    {salesResult.marketingSuggestions.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pricing */}
                <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                      <Tag className="w-4 h-4" />
                    </span>
                    <h5 className="font-semibold text-gray-900 text-sm">Pricing Suggestions</h5>
                  </div>
                  <ul className="space-y-2.5">
                    {salesResult.pricingSuggestions.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Product Improvements */}
                <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="p-1.5 bg-purple-100 text-purple-700 rounded-md">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h5 className="font-semibold text-gray-900 text-sm">Product Improvements</h5>
                  </div>
                  <ul className="space-y-2.5">
                    {salesResult.productImprovements.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-purple-500 font-bold shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Actions Table */}
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-5">
                <h5 className="font-bold text-gray-900 text-sm mb-3">Priority Action Roadmap</h5>
                <div className="space-y-2.5">
                  {salesResult.recommendedActions.map((actionItem, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            actionItem.priority === 'HIGH'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {actionItem.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {actionItem.action}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold shrink-0">
                        {actionItem.expectedImpact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Automated Product Optimizer */}
      {activeTab === 'optimizer' && (
        <div className="p-6 space-y-6">
          {/* Product Selector */}
          <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-gray-200">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Select Product to Optimize
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setOptResult(null);
                  setAppliedSuccess(false);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({formatPrice(p.price)}) - {getCategoryName(p.category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-auto mt-auto">
              <button
                onClick={handleRunOptimizer}
                disabled={optLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {optLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze & Generate Optimization
              </button>
            </div>
          </div>

          {appliedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-sm font-medium">
                Optimization successfully applied to product! SEO metadata, tags, and titles
                updated.
              </div>
            </div>
          )}

          {/* Side by side comparison */}
          {optResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                    Projected Visibility Score: {optResult.projectedVisibilityScore}/100
                  </span>
                  <span className="text-xs text-gray-500">Tone: Commercial High-Conversion</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Cancel Edit' : 'Edit Copy'}
                  </button>
                  <button
                    onClick={handleApplyOptimization}
                    disabled={optLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept & Apply Optimization
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Current */}
                <div className="p-5 bg-slate-50 border border-gray-200 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                    Current Version
                  </span>
                  <h4 className="text-base font-bold text-gray-800 mb-2">
                    {optResult.currentTitle}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {optResult.currentDescription}
                  </p>
                </div>

                {/* AI Optimized */}
                <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-2">
                    AI Optimized Version
                  </span>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Product Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Description (Markdown)
                        </label>
                        <textarea
                          rows={6}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-base font-bold text-indigo-950 mb-2">
                        {optResult.optimizedTitle}
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-normal">
                        {optResult.optimizedDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Keywords and Meta Tags */}
              <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Search Engine Optimization (SEO) & Indexing Metadata
                </h5>
                <div>
                  <span className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Target Keywords:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {optResult.seoKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Product Tags:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {optResult.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium border border-indigo-100"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <strong>Meta Description:</strong> {optResult.metaDescription}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fraud Risk Detection */}
      {activeTab === 'fraud' && (
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-gray-900">
                Autonomous Order Risk Assessment
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Multi-factor risk scoring engine evaluating payment failures, transaction velocity,
                and behavioral anomalies.
              </p>
            </div>
            <button
              onClick={loadFraudOrders}
              disabled={fraudLoading}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fraudLoading ? 'animate-spin' : ''}`} />
              Re-scan Flagged Orders
            </button>
          </div>

          <div className="space-y-3">
            {fraudOrders.map((assessment) => (
              <div
                key={assessment.orderId}
                className="p-5 bg-white border border-gray-200 rounded-xl shadow-xs hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {assessment.orderNumber}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        assessment.riskLevel === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : assessment.riskLevel === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      RiskScore: {assessment.riskScore}/100 ({assessment.riskLevel})
                    </span>
                    <span className="text-xs text-gray-400">
                      Evaluated {new Date(assessment.evaluatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Triggers list */}
                  <div className="space-y-1">
                    {assessment.triggers.map((trigger, idx) => (
                      <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{trigger}</span>
                      </div>
                    ))}
                  </div>

                  {/* Breakdown pill */}
                  <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-gray-500">
                    <span>Value Spike: +{assessment.breakdown.suspiciousOrderValue}</span>
                    <span>Behavior Anomalies: +{assessment.breakdown.unusualBehavior}</span>
                    <span>
                      Failed Gateway Attempts: +{assessment.breakdown.failedPaymentAttempts}
                    </span>
                    <span>Account Freshness: +{assessment.breakdown.accountAgeRisk}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => alert(`Order ${assessment.orderNumber} Approved by Seller.`)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Approve Order
                  </button>
                  <button
                    onClick={() =>
                      alert(`Order ${assessment.orderNumber} Locked for Verification.`)
                    }
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Hold / Verify Buyer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Redis Queue Background Automations */}
      {activeTab === 'automation' && (
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-5">
            <h4 className="text-base font-bold text-gray-900 mb-1">
              Redis Queue Background Automation Architecture
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Autonomous background cron workers execute nightly analytics aggregation, continuous
              vector recalculation for customer recommendations, proactive low-stock alerts, and
              batch SEO enhancements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <span className="text-xs font-semibold text-gray-400 block mb-1">
                  Worker Task 1
                </span>
                <h5 className="text-sm font-bold text-gray-900">Daily Seller Digest</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Aggregates revenue, margin, and traffic highlights delivered every morning.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <span className="text-xs font-semibold text-gray-400 block mb-1">
                  Worker Task 2
                </span>
                <h5 className="text-sm font-bold text-gray-900">Catalog Vector Refresh</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Recalculates pgvector embeddings for newly edited products and reviews.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <span className="text-xs font-semibold text-gray-400 block mb-1">
                  Worker Task 3
                </span>
                <h5 className="text-sm font-bold text-gray-900">Predictive Stock Alerts</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Forecasts inventory runout dates based on velocity and lead times.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <span className="text-xs font-semibold text-gray-400 block mb-1">
                  Worker Task 4
                </span>
                <h5 className="text-sm font-bold text-gray-900">Personalized Engine</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Precomputes personalized product affinity maps per registered user.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => handleRunAutomation('ALL')}
                disabled={autoLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Zap className={`w-4 h-4 ${autoLoading ? 'animate-spin' : ''}`} />
                {autoLoading ? 'Executing Queue Pipeline...' : 'Run Pipeline Now'}
              </button>
            </div>
          </div>

          {autoResult && (
            <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Pipeline Execution Status: {autoResult.status}
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">{autoResult.summary}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-emerald-200/60">
                <div className="p-3 bg-white/80 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Seller Digests</span>
                  <span className="text-sm font-bold text-gray-900">
                    {autoResult.executions.dailySellerReportsGenerated || 14} dispatched
                  </span>
                </div>
                <div className="p-3 bg-white/80 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Products Analyzed</span>
                  <span className="text-sm font-bold text-gray-900">
                    {autoResult.executions.productsOptimizedAnalyzed || 48} SKUs
                  </span>
                </div>
                <div className="p-3 bg-white/80 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Rec. Batches</span>
                  <span className="text-sm font-bold text-gray-900">
                    {autoResult.executions.customerRecommendationBatches || 120} computed
                  </span>
                </div>
                <div className="p-3 bg-white/80 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Inventory Alerts</span>
                  <span className="text-sm font-bold text-gray-900">
                    {autoResult.executions.inventoryAlertsTriggered || 3} flagged
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
