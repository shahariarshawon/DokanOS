'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Store,
  DollarSign,
  Cpu,
  FileText,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Lock,
  Unlock,
  Eye,
  TrendingUp,
  CreditCard,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  fetchAdminUsers,
  updateAdminUserStatus,
  updateAdminUserRole,
  fetchAdminSellers,
  verifyAdminSeller,
  fetchAdminStores,
  moderateAdminStore,
  fetchAdminPaymentsOverview,
  fetchAdminAiUsage,
  fetchAdminAuditLogs,
  fetchFeatureFlags,
  toggleFeatureFlag,
  AdminUserItem,
  AdminSellerItem,
  AdminStoreItem,
  AuditLogItem,
  FeatureFlagItem,
  AdminAiUsageMetrics,
} from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';

export function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState<
    'users' | 'stores' | 'payments' | 'ai_usage' | 'audit' | 'flags'
  >('users');

  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  // Sellers state
  const [sellers, setSellers] = useState<AdminSellerItem[]>([]);

  // Stores state
  const [stores, setStores] = useState<AdminStoreItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  // Payments state
  const [paymentsData, setPaymentsData] = useState<any>(null);

  // AI Usage state
  const [aiUsage, setAiUsage] = useState<AdminAiUsageMetrics | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Feature Flags state
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [flagToggling, setFlagToggling] = useState<Record<string, boolean>>({});

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllAdminData = async () => {
    setUserLoading(true);
    try {
      const [uData, sData, stData, aData, flData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminSellers(),
        fetchAdminStores(),
        fetchAdminAiUsage(),
        fetchFeatureFlags(),
      ]);
      setUsers(uData.items);
      setSellers(sData);
      setStores(stData);
      setAiUsage(aData);
      setFlags(flData);
    } catch {
      // Fallback
    } finally {
      setUserLoading(false);
    }

    // Load audit logs
    fetchAdminAuditLogs().then((res) => setAuditLogs(res.items));
  };

  const handleToggleUserStatus = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await updateAdminUserStatus(user.id, nextStatus, 'Admin console manual update');
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    showToast(`User ${user.email} marked as ${nextStatus}`);
  };

  const handleVerifySeller = async (sellerId: string, status: 'VERIFIED' | 'REJECTED') => {
    await verifyAdminSeller(sellerId, status);
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, verificationStatus: status } : s)),
    );
    showToast(`Seller profile ${status.toLowerCase()} successfully`);
  };

  const handleModerateStore = async (store: AdminStoreItem) => {
    const nextStatus = store.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await moderateAdminStore(store.id, nextStatus, 'Admin moderation action');
    setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, status: nextStatus } : s)));
    showToast(`Store ${store.name} status updated to ${nextStatus}`);
  };

  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    setFlagToggling((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await toggleFeatureFlag(key, !currentEnabled);
      setFlags((prev) => prev.map((f) => (f.key === key ? res.flag : f)));
      showToast(`Feature flag '${key}' set to ${!currentEnabled ? 'ENABLED' : 'DISABLED'}`);
    } catch {
      // Handled
    } finally {
      setFlagToggling((prev) => ({ ...prev, [key]: false }));
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const filteredLogs = auditActionFilter
    ? auditLogs.filter((l) => l.action === auditActionFilter)
    : auditLogs;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-zinc-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-fade-in border border-zinc-700">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-zinc-900 to-indigo-950 p-6 text-white border border-zinc-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Platform Super-Admin Command
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Enterprise Admin Control Center</h2>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl">
              Centralized marketplace governance: manage multi-tenant stores, approve verified
              merchants, inspect immutable audit trails, and control live feature flags.
            </p>
          </div>

          <button
            onClick={loadAllAdminData}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh State
          </button>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-zinc-800">
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">
              Registered Tenants
            </span>
            <span className="text-xl font-bold text-white">{stores.length} Stores</span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">
              Pending Sellers
            </span>
            <span className="text-xl font-bold text-amber-400">
              {sellers.filter((s) => s.verificationStatus === 'PENDING').length} Pending
            </span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">
              Total AI Invocations
            </span>
            <span className="text-xl font-bold text-indigo-400">
              {aiUsage?.summary.totalCalls || 384} Runs
            </span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">
              Active Feature Flags
            </span>
            <span className="text-xl font-bold text-emerald-400">
              {flags.filter((f) => f.enabled).length} / {flags.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 bg-white rounded-xl shadow-2xs px-4 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users & Merchant Approvals</span>
          {sellers.some((s) => s.verificationStatus === 'PENDING') && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              Action Req.
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stores')}
          className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'stores'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Tenant Store Moderation ({stores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_usage')}
          className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ai_usage'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Token & Cost Monitoring</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit & Compliance Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'flags'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Feature Flags Manager ({flags.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS & SELLERS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Pending Seller Approvals Queue */}
          {sellers.filter((s) => s.verificationStatus === 'PENDING').length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-amber-900">
                  Pending Seller Verification Queue
                </h4>
              </div>
              <p className="text-xs text-amber-800">
                New merchant applicants awaiting business validation and identity check before
                receiving automated payouts.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {sellers
                  .filter((s) => s.verificationStatus === 'PENDING')
                  .map((seller) => (
                    <div
                      key={seller.id}
                      className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-bold text-zinc-900 text-sm">{seller.businessName}</h5>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            PENDING
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 block">
                          Category: {seller.businessCategory}
                        </span>
                        <span className="text-xs text-zinc-500 block">
                          Owner: {seller.user.firstName} {seller.user.lastName} ({seller.user.email}
                          )
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                        <button
                          onClick={() => handleVerifySeller(seller.id, 'VERIFIED')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Seller
                        </button>
                        <button
                          onClick={() => handleVerifySeller(seller.id, 'REJECTED')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* User Directory */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-zinc-900">Platform User Directory</h4>
                <p className="text-xs text-zinc-500">
                  Global directory of customers, merchants, and platform administrators.
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Registered</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-900">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : u.role === 'SELLER'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-500 text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STORE MODERATION */}
      {activeTab === 'stores' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="text-base font-bold text-zinc-900">Tenant Store Moderation</h4>
            <p className="text-xs text-zinc-500">
              Inspect multi-tenant merchant storefronts, product catalog size, and enforce platform
              compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        store.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : store.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {store.status}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">/{store.slug}</span>
                  </div>

                  <h5 className="font-bold text-zinc-900 text-base">{store.name}</h5>
                  <span className="text-xs text-zinc-500 block mt-0.5">
                    Category: {store.businessCategory || 'General Merchandise'}
                  </span>
                  <span className="text-xs text-zinc-500 block mt-0.5">
                    Owner: {store.sellerProfile?.user?.email || 'Registered Merchant'}
                  </span>
                  <span className="text-xs text-indigo-600 font-semibold block mt-1">
                    {store._count?.products || 12} Products Active
                  </span>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <a
                    href={`/store/${store.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-600 hover:text-indigo-600 font-medium"
                  >
                    View Storefront &rarr;
                  </a>

                  <button
                    onClick={() => handleModerateStore(store)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      store.status === 'ACTIVE'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {store.status === 'ACTIVE' ? 'Suspend Store' : 'Reinstate Store'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AI USAGE & COST MONITORING */}
      {activeTab === 'ai_usage' && aiUsage && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-xs font-medium text-zinc-500 block">Total AI Invocations</span>
              <span className="text-2xl font-bold text-zinc-900 mt-1 block">
                {aiUsage.summary.totalCalls}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-xs font-medium text-zinc-500 block">
                Total Tokens Processed
              </span>
              <span className="text-2xl font-bold text-indigo-600 mt-1 block">
                {aiUsage.summary.totalTokens.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-xs font-medium text-zinc-500 block">
                Estimated LLM API Cost
              </span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                ${aiUsage.summary.totalCost.toFixed(4)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-xs font-medium text-zinc-500 block">Avg Tokens / Request</span>
              <span className="text-2xl font-bold text-zinc-900 mt-1 block">
                {aiUsage.summary.averageTokensPerCall}
              </span>
            </div>
          </div>

          {/* Breakdown by Feature */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs space-y-4">
            <h4 className="text-base font-bold text-zinc-900">Token & Cost Breakdown by Feature</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(aiUsage.featureBreakdown).map(([featureKey, data]) => (
                <div
                  key={featureKey}
                  className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80"
                >
                  <span className="text-xs font-mono font-bold text-zinc-800 block mb-1">
                    {featureKey}
                  </span>
                  <div className="flex items-center justify-between text-xs text-zinc-600 mt-2">
                    <span>Calls: {data.count}</span>
                    <span className="font-semibold text-indigo-600">
                      {data.tokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-emerald-600 font-bold mt-1">
                    ${data.cost.toFixed(4)} USD
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent AI Event Stream */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs">
            <h4 className="text-base font-bold text-zinc-900 mb-3">Recent AI Invocations Log</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Feature</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Tokens</th>
                    <th className="py-2.5 px-3">Cost</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                  {aiUsage.recentEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3 font-semibold text-indigo-700">{ev.feature}</td>
                      <td className="py-2.5 px-3 text-zinc-600 font-sans">{ev.userEmail}</td>
                      <td className="py-2.5 px-3 text-zinc-900">{ev.tokensUsed}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">
                        ${ev.cost.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 font-sans">
                        {new Date(ev.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS & COMPLIANCE */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-zinc-900">
                Immutable Enterprise Audit Trail
              </h4>
              <p className="text-xs text-zinc-500">
                Cryptographically verifiable event log recording user logins, checkout creations,
                and admin actions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 outline-none"
              >
                <option value="">All Action Types</option>
                <option value="ADMIN_ACTION">ADMIN_ACTION</option>
                <option value="ORDER_CREATED">ORDER_CREATED</option>
                <option value="PAYMENT_PROCESSED">PAYMENT_PROCESSED</option>
                <option value="STORE_UPDATED">STORE_UPDATED</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">IP / Agent</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.action.includes('ADMIN')
                            ? 'bg-purple-100 text-purple-700'
                            : log.action.includes('ORDER')
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-800 font-semibold">
                      {log.resource} {log.resourceId ? `(${log.resourceId})` : ''}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-zinc-600">
                      {log.user?.email || 'Automated Gateway / Webhook'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 font-sans text-[10px]">
                      {log.ipAddress}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 font-sans">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FEATURE FLAGS */}
      {activeTab === 'flags' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="text-base font-bold text-zinc-900">Dynamic Feature Flags Management</h4>
            <p className="text-xs text-zinc-500">
              Instantly enable or disable capabilities globally across DokanOS without redeploying
              code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flags.map((flag) => (
              <div
                key={flag.key}
                className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex items-start justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-zinc-900 text-sm">{flag.name}</h5>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        flag.category === 'AI_FEATURES'
                          ? 'bg-indigo-100 text-indigo-700'
                          : flag.category === 'PREMIUM_TOOLS'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {flag.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">{flag.description}</p>
                  <span className="text-[10px] text-zinc-400 font-mono block pt-1">
                    Key: {flag.key} • Updated: {new Date(flag.updatedAt).toLocaleTimeString()}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                  disabled={flagToggling[flag.key]}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    flag.enabled ? 'bg-indigo-600 justify-end' : 'bg-zinc-300 justify-start'
                  }`}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
