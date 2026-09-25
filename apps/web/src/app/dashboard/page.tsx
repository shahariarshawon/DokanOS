'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Copy,
  Trash2,
  Edit,
  Search,
  Filter,
  RefreshCw,
  Truck,
  CheckCircle2,
  X,
  Store,
  Layers,
  BarChart3,
  Calendar,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Cpu,
  CreditCard,
  Check,
  Receipt,
  ExternalLink,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { AISalesCopilot } from '@/components/ai/ai-sales-copilot';
import {
  fetchProducts,
  fetchInventoryOverview,
  fetchInventoryTransactions,
  duplicateProduct,
  deleteProduct,
  adjustInventoryStock,
  fetchSellerAiInsights,
  generateSellerCopilotCopy,
  analyzeProductImageAi,
  fetchSellerBilling,
  cancelSellerSubscription,
  fetchAdminRevenueOverview,
  InventoryOverview,
  InventoryTransactionItem,
  SellerBillingOverview,
  AdminRevenueOverview,
} from '@/lib/api-client';
import { Product, ProductVariant } from '@/lib/mock-data';
import { formatPrice, formatDate } from '@/lib/utils';

export default function SellerDashboardPage() {
  const [dashboardView, setDashboardView] = useState<'seller' | 'admin'>('seller');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<
    | 'products'
    | 'store_builder'
    | 'inventory'
    | 'orders'
    | 'billing'
    | 'messages'
    | 'analytics'
    | 'ai_copilot'
  >('products');
  const [storeSubTab, setStoreSubTab] = useState<
    'profile' | 'theme' | 'sections' | 'analytics' | 'reviews'
  >('profile');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Store Builder State
  const [storeData, setStoreData] = useState<any>({
    name: 'Apple Zone Official',
    slug: 'apple-zone',
    description:
      'Authorized store for premium Apple devices, genuine accessories, and certified warranty replacements.',
    businessCategory: 'Consumer Electronics & Gadgets',
    contactEmail: 'support@applezone.com',
    contactPhone: '+1 (800) 555-0199',
    socialLinks: {
      twitter: 'https://twitter.com/applezone',
      instagram: 'https://instagram.com/applezone',
    },
    logo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
    banner:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&auto=format&fit=crop&q=80',
    followerCount: 248,
    status: 'ACTIVE',
  });

  const [themeData, setThemeData] = useState<any>({
    primaryColor: '#0f172a',
    secondaryColor: '#3b82f6',
    layoutType: 'Modern',
    fontStyle: 'Inter',
  });

  const [sectionsData, setSectionsData] = useState<any[]>([
    {
      id: 'sec-1',
      type: 'HERO',
      title: 'Next-Gen Apple Innovation',
      subtitle:
        'Discover M3 Max MacBook Pros, iPhone 16 Pro Max, and Ultra 2 Watch with official 2-year warranty.',
      enabled: true,
      displayOrder: 0,
    },
    {
      id: 'sec-2',
      type: 'FEATURED_PRODUCTS',
      title: 'Featured Flagship Devices',
      subtitle: 'Hand-picked premium electronics ready for immediate dispatch.',
      enabled: true,
      displayOrder: 1,
    },
    {
      id: 'sec-3',
      type: 'NEW_ARRIVALS',
      title: 'New Arrivals',
      subtitle: 'Freshly stocked inventory from authorized distribution lines.',
      enabled: true,
      displayOrder: 2,
    },
    {
      id: 'sec-4',
      type: 'BEST_SELLERS',
      title: 'Top Rated Best Sellers',
      subtitle: 'Most popular customer favorites backed by verified 5-star reviews.',
      enabled: true,
      displayOrder: 3,
    },
    {
      id: 'sec-5',
      type: 'ABOUT',
      title: 'About Apple Zone',
      subtitle:
        'Delivering genuine luxury consumer electronics worldwide with insured express shipping.',
      enabled: true,
      displayOrder: 4,
    },
    {
      id: 'sec-6',
      type: 'CONTACT',
      title: 'Customer Concierge',
      subtitle: 'Have a question? Reach out to our dedicated product support team.',
      enabled: true,
      displayOrder: 5,
    },
  ]);

  const [analyticsData, setAnalyticsData] = useState<any>({
    views: 1420,
    orders: 142,
    revenue: 28490,
    salesOverTime: [
      { date: 'Sep 19', sales: 3200, visitors: 180 },
      { date: 'Sep 20', sales: 4100, visitors: 220 },
      { date: 'Sep 21', sales: 3800, visitors: 195 },
      { date: 'Sep 22', sales: 5200, visitors: 260 },
      { date: 'Sep 23', sales: 4800, visitors: 240 },
      { date: 'Sep 24', sales: 6100, visitors: 310 },
      { date: 'Sep 25', sales: 7400, visitors: 380 },
    ],
    topProducts: [
      { name: 'Apple iPhone 15 Pro Max', units: 42, revenue: 46158 },
      { name: 'MacBook Pro 16" M3 Max', units: 18, revenue: 44982 },
      { name: 'Apple Watch Ultra 2', units: 35, revenue: 27965 },
    ],
  });

  const [reviewsData, setReviewsData] = useState<any[]>([
    {
      id: 'rev-1',
      rating: 5,
      comment: 'Phenomenal delivery speed! Product arrived sealed in perfect condition.',
      createdAt: '2026-09-24',
      user: { name: 'Marcus Vance' },
    },
    {
      id: 'rev-2',
      rating: 5,
      comment: 'Authentic item with valid AppleCare warranty. Will buy again!',
      createdAt: '2026-09-23',
      user: { name: 'Elena Rostova' },
    },
    {
      id: 'rev-3',
      rating: 4,
      comment: 'Great seller communication, smooth checkout process.',
      createdAt: '2026-09-20',
      user: { name: 'David K.' },
    },
  ]);

  // Restock Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<string>('');
  const [selectedVariantForRestock, setSelectedVariantForRestock] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockNote, setRestockNote] = useState<string>('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Smartphones & Tech');
  const [newPrice, setNewPrice] = useState(499);
  const [newStock, setNewStock] = useState(25);
  const [newSku, setNewSku] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [productImageUrl, setProductImageUrl] = useState(
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
  );
  const [isGeneratingCopilot, setIsGeneratingCopilot] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiGeneratedTags, setAiGeneratedTags] = useState<string[]>([]);
  const [aiMarketingCopy, setAiMarketingCopy] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  // Billing & Subscriptions State
  const [billingData, setBillingData] = useState<SellerBillingOverview | null>(null);
  const [adminRevenue, setAdminRevenue] = useState<AdminRevenueOverview | null>(null);
  const [isCancellingSub, setIsCancellingSub] = useState(false);

  // Orders State (for Fulfillment Tab)
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, invRes, txnRes, insightsRes, billingRes, adminRevRes] = await Promise.all([
        fetchProducts({ limit: 50 }),
        fetchInventoryOverview(),
        fetchInventoryTransactions(),
        fetchSellerAiInsights(),
        fetchSellerBilling().catch(() => null),
        fetchAdminRevenueOverview().catch(() => null),
      ]);
      setProducts(prodRes.data);
      setInventoryOverview(invRes);
      setTransactions(txnRes);
      if (insightsRes?.insights) {
        setAiInsights(insightsRes.insights);
      }
      if (billingRes) {
        setBillingData(billingRes);
      }
      if (adminRevRes) {
        setAdminRevenue(adminRevRes);
      }

      // Load local seller orders
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('dokanos_orders');
          if (stored) {
            setSellerOrders(JSON.parse(stored));
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCopilot = async () => {
    if (!newTitle.trim()) {
      showToast('Please enter a product title or seed keyword first (e.g. Wireless Headphones)');
      return;
    }
    setIsGeneratingCopilot(true);
    try {
      const result = await generateSellerCopilotCopy({
        productName: newTitle,
        category: newCategory,
        features: [
          'Premium Ergonomic Finish',
          'Bluetooth 5.4 Low Latency',
          'Fast USB-C Quick Charge',
        ],
      });
      if (result) {
        setNewDescription(result.description);
        setAiMarketingCopy(result.marketingText || '');
        if (result.tags && result.tags.length > 0) {
          setAiGeneratedTags(result.tags);
        }
        showToast('✨ AI Copilot generated title, SEO description, and keywords!');
      }
    } catch {
      showToast('Failed to generate AI product copy');
    } finally {
      setIsGeneratingCopilot(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!productImageUrl.trim()) {
      showToast('Please provide an image URL to analyze');
      return;
    }
    setIsAnalyzingImage(true);
    try {
      const analysis = await analyzeProductImageAi(productImageUrl);
      if (analysis) {
        if (analysis.category) {
          setNewCategory(analysis.category);
        }
        if (!newTitle.trim() && analysis.suggestedTitle) {
          setNewTitle(analysis.suggestedTitle);
        }
        if (analysis.tags) {
          setAiGeneratedTags(analysis.tags);
        }
        const appendedSpecs = `\n\n**Visual Attributes Detected by AI Vision:**\n- Color: ${analysis.color || 'Dynamic'}\n- Style: ${analysis.style || 'Modern'}\n- Material: ${analysis.material || 'Engineered'}\n`;
        setNewDescription((prev) => (prev ? prev + appendedSpecs : appendedSpecs.trim()));
        showToast(
          `📷 Vision AI detected: ${analysis.category} (${analysis.material}, ${analysis.color})`,
        );
      }
    } catch {
      showToast('Failed to analyze image with Vision AI');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Storefront profile & branding saved successfully!');
  };

  const handleSaveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Storefront color palette & theme saved!');
  };

  const handleSaveSections = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Homepage section configuration & layout order saved!');
  };

  const handleDuplicate = async (productId: string) => {
    try {
      const cloned = await duplicateProduct(productId);
      showToast(`Duplicated "${cloned.title}" with fresh SKU codes`);
      await loadData();
    } catch {
      showToast('Failed to duplicate product');
    }
  };

  const handleDelete = async (productId: string, title: string) => {
    if (confirm(`Are you sure you want to archive "${title}"?`)) {
      await deleteProduct(productId);
      showToast(`Archived "${title}" successfully`);
      await loadData();
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRestock || restockQty === 0) return;

    setIsSubmittingRestock(true);
    try {
      await adjustInventoryStock({
        productId: selectedProductForRestock,
        variantId: selectedVariantForRestock || undefined,
        type: restockQty > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        quantity: restockQty,
        note: restockNote || (restockQty > 0 ? 'Restock shipment' : 'Manual stock deduction'),
      });
      showToast(`Successfully adjusted stock by ${restockQty > 0 ? `+${restockQty}` : restockQty}`);
      setShowRestockModal(false);
      setRestockQty(50);
      setRestockNote('');
      await loadData();
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const sku = newSku.trim() || `PRD-${randomSuffix.toUpperCase()}`;
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newProd: Product = {
      id: `prod-new-${Date.now()}`,
      title: newTitle,
      slug: `${slug}-${randomSuffix}`,
      description: newDescription || 'Premium marketplace product catalog listing.',
      price: newPrice,
      compareAtPrice: newPrice * 1.15,
      category: newCategory,
      categorySlug: newCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku,
      stock: newStock,
      lowStockThreshold: 5,
      rating: 5.0,
      reviewCount: 1,
      storeId: 'store-my-store',
      storeName: storeData.name,
      storeSlug: storeData.slug,
      storeRating: 5.0,
      badge: 'New Arrival',
      primaryImage:
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
      ],
      variants: [
        {
          id: `var-${Date.now()}-1`,
          productId: `prod-new-${Date.now()}`,
          title: 'Standard Edition',
          sku: `${sku}-STD`,
          price: newPrice,
          stockQuantity: newStock,
          attributes: { edition: 'Standard' },
          isDefault: true,
        },
      ],
      attributes: {
        Warranty: '1 Year Manufacturer Warranty',
      },
    };

    setProducts([newProd, ...products]);
    setShowAddProductModal(false);
    setNewTitle('');
    setNewSku('');
    setNewDescription('');
    showToast(`Created product "${newTitle}" with initial inventory of ${newStock}`);
  };

  const handleUpdateOrderStatus = (orderId: string, nextStatus: string) => {
    const updated = sellerOrders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
    setSellerOrders(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dokanos_orders', JSON.stringify(updated));
    }
    showToast(`Order #${orderId} moved to ${nextStatus}`);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.category.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          id="dashboard-toast"
          data-testid="dashboard-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Switcher & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 border border-zinc-200">
            <button
              data-testid="tab-seller-dashboard"
              onClick={() => setDashboardView('seller')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                dashboardView === 'seller'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Seller Dashboard
            </button>
            <button
              data-testid="tab-admin-dashboard"
              onClick={() => setDashboardView('admin')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                dashboardView === 'admin'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Admin Intelligence
            </button>
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-1.5">
            {(['7d', '30d', '90d', '1y'] as const).map((r) => {
              const labels: Record<string, string> = {
                '7d': '7 Days',
                '30d': '30 Days',
                '90d': '90 Days',
                '1y': '1 Year',
              };
              return (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    dateRange === r
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {labels[r]}
                </button>
              );
            })}
          </div>
        </div>

        {dashboardView === 'admin' ? (
          /* Admin Intelligence View */
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Gross Marketplace Volume (GMV)</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Platform-wide GMV, vendor settlement ledger, and escrow solvency.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  Gross Marketplace Volume (GMV)
                </div>
                <div className="text-2xl font-black text-zinc-900">$184,320.00</div>
                <div className="mt-2 text-[11px] text-emerald-600 font-semibold">
                  +22.4% this quarter
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  Platform Take Rate
                </div>
                <div className="text-2xl font-black text-zinc-900">12.5%</div>
                <div className="mt-2 text-[11px] text-indigo-600 font-semibold">
                  $23,040.00 platform take
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  Active Stores
                </div>
                <div className="text-2xl font-black text-zinc-900">42 Stores</div>
                <div className="mt-2 text-[11px] text-zinc-500">Across 6 categories</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  Escrow Balance
                </div>
                <div className="text-2xl font-black text-zinc-900">$48,200.00</div>
                <div className="mt-2 text-[11px] text-emerald-600 font-semibold">
                  100% solvency guaranteed
                </div>
              </div>
            </div>

            {/* SaaS Subscription & MRR Metrics */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-white p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100/70">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      SaaS Recurring Revenue & Subscriptions (Phase 4)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Stripe & SSLCommerz recurring billing engine & tier distribution
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    Live Engine
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white p-4 border border-indigo-100/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Monthly Recurring Revenue (MRR)
                  </span>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {adminRevenue ? formatPrice(adminRevenue.monthlyRecurringRevenue) : '$4,940.00'}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                    +18.5% new subscribers this month
                  </span>
                </div>

                <div className="rounded-xl bg-white p-4 border border-indigo-100/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Active Subscriptions
                  </span>
                  <div className="text-2xl font-black text-zinc-900 mt-1">
                    {adminRevenue ? adminRevenue.activeSubscriptions : 260}
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-1">
                    {adminRevenue?.planBreakdown ? adminRevenue.planBreakdown.PRO : 260} PRO /{' '}
                    {adminRevenue?.planBreakdown ? adminRevenue.planBreakdown.FREE : 84} FREE
                  </span>
                </div>

                <div className="rounded-xl bg-white p-4 border border-indigo-100/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Total Lifetime Revenue
                  </span>
                  <div className="text-2xl font-black text-zinc-900 mt-1">
                    {adminRevenue ? formatPrice(adminRevenue.totalRevenue) : '$184,320.00'}
                  </div>
                  <span className="text-[11px] text-indigo-600 font-semibold block mt-1">
                    SaaS + Marketplace commission
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Payment Transactions Log */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Payment Gateway Audit Log (Stripe & SSLCommerz)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Real-time webhook and settlement transactions with cryptographic idempotency
                    keys
                  </p>
                </div>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-mono text-zinc-600">
                  Idempotency Verified
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Gateway</th>
                      <th className="py-3 px-4">Transaction / Ref</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                    {adminRevenue?.recentTransactions &&
                    adminRevenue.recentTransactions.length > 0 ? (
                      adminRevenue.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                                tx.gateway === 'STRIPE'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {tx.gateway}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-900">
                            {tx.transactionRef || tx.id}
                          </td>
                          <td className="py-3 px-4 font-sans text-zinc-600">{tx.type}</td>
                          <td className="py-3 px-4 font-bold text-zinc-900">
                            {formatPrice(tx.amount)} {tx.currency}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-sans">
                            {formatDate(tx.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-indigo-50 text-indigo-700">
                              STRIPE
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-900">
                            cs_live_9a87d0f9831a
                          </td>
                          <td className="py-3 px-4 font-sans text-zinc-600">CUSTOMER_ORDER</td>
                          <td className="py-3 px-4 font-bold text-zinc-900">$2,499.00 USD</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              COMPLETED
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-sans">Just now</td>
                        </tr>
                        <tr className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-50 text-emerald-700">
                              SSLCOMMERZ
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-900">SSLC_TXN_8819204</td>
                          <td className="py-3 px-4 font-sans text-zinc-600">CUSTOMER_ORDER</td>
                          <td className="py-3 px-4 font-bold text-zinc-900">৳ 14,500.00 BDT</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              COMPLETED
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-sans">15 mins ago</td>
                        </tr>
                        <tr className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-indigo-50 text-indigo-700">
                              STRIPE
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-900">sub_1Ok2M848a9s82</td>
                          <td className="py-3 px-4 font-sans text-zinc-600">
                            SELLER_SUBSCRIPTION (PRO)
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900">$19.00 USD</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              COMPLETED
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-sans">1 hour ago</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Seller Dashboard Main View */
          <div id="seller-dashboard" data-testid="seller-dashboard" className="space-y-8">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Seller Control Center
                  </h1>
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Manage multi-variant SKU catalog, real-time inventory adjustments, and custom
                  storefront.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href={`/store/${storeData.slug}`}
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Preview Live Store</span>
                </Link>
                <button
                  onClick={() => setShowRestockModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Adjust Stock</span>
                </button>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Product</span>
                </button>
              </div>
            </div>

            {/* AI Seller Insights & Growth Copilot (Phase 3) */}
            {aiInsights.length > 0 && (
              <div
                id="ai-seller-insights"
                data-testid="ai-seller-insights"
                className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white p-5 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900">
                          AI Seller Copilot & Growth Intelligence
                        </h3>
                        <span className="rounded-full bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                          Phase 3 Active
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Autonomous catalog optimization, competitor price benchmarking & review
                        sentiment
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/80 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-2xs">
                    {aiInsights.length} Recommendations Available
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                  {aiInsights.map((ins: any) => (
                    <div
                      key={ins.id}
                      className="rounded-xl border border-white/90 bg-white/90 backdrop-blur-xs p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            {ins.type}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            {ins.impact}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-900 line-clamp-1">
                          {ins.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                          {ins.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast(`AI Action applied: "${ins.actionText}"`)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <span>{ins.actionText}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div
                data-testid="metric-total-sales"
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Gross Sales</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div
                  data-testid="metric-total-sales-value"
                  className="text-2xl font-black text-zinc-900"
                >
                  $28,490.00
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                  <TrendingUp className="w-3 h-3" /> +14.2% vs last month
                </div>
              </div>

              <div
                data-testid="metric-net-revenue"
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Store Visitors
                  </span>
                  <Store className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-zinc-900">{analyticsData.views}</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                  <TrendingUp className="w-3 h-3" /> {storeData.followerCount} Store Followers
                </div>
              </div>

              <div
                data-testid="metric-orders-count"
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-zinc-900">142</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                  <TrendingUp className="w-3 h-3" /> +8 new orders today
                </div>
              </div>

              <div
                data-testid="metric-conversion-rate"
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Conversion Rate
                  </span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-zinc-900">3.4%</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                  <TrendingUp className="w-3 h-3" /> Above industry average
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-px text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Product Management</span>
                <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-600">
                  {products.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('store_builder')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'store_builder'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Store Builder Studio</span>
                <span className="ml-1 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] text-indigo-700 font-bold">
                  NEW
                </span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'inventory'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Inventory & Audit Trail</span>
                {inventoryOverview && inventoryOverview.lowStockProducts > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] text-amber-700 font-bold">
                    {inventoryOverview.lowStockProducts} alerts
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Fulfillment Hub</span>
                <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-600">
                  {sellerOrders.length}
                </span>
              </button>

              <button
                data-testid="tab-billing"
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'billing'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Billing & Subscription</span>
                <span className="ml-1 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] text-indigo-700 font-bold">
                  {billingData?.subscription?.plan?.tier || 'PRO'}
                </span>
              </button>

              <button
                data-testid="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Analytics & BI</span>
                <span className="ml-1 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] text-indigo-700 font-bold">
                  AI INSIGHTS
                </span>
              </button>

              <button
                data-testid="tab-ai-copilot"
                onClick={() => setActiveTab('ai_copilot')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'ai_copilot'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Copilot & Automation</span>
                <span className="ml-1 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] text-indigo-700 font-bold">
                  PHASE 9
                </span>
              </button>

              <Link
                href="/inbox"
                className="flex items-center gap-1.5 px-4 py-2.5 border-b-2 border-transparent text-zinc-500 hover:text-zinc-900 transition-all whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Customer Inquiries</span>
                <span className="ml-1 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10px] text-emerald-700 font-bold">
                  LIVE CHAT
                </span>
              </Link>
            </div>

            {/* TAB 1: PRODUCT MANAGEMENT TABLE */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative max-w-sm w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter by title, SKU, or category..."
                      className="w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-indigo-600 shadow-2xs"
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    Showing {filteredProducts.length} of {products.length} products
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Variants</th>
                          <th className="py-3 px-4">Stock</th>
                          <th className="py-3 px-4">Base Price</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredProducts.map((prod) => (
                          <tr key={prod.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.primaryImage}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover border border-zinc-200 shrink-0"
                                />
                                <div>
                                  <Link
                                    href={`/products/${prod.id}`}
                                    className="font-semibold text-zinc-900 hover:text-indigo-600 transition-colors line-clamp-1"
                                  >
                                    {prod.title}
                                  </Link>
                                  <span className="font-mono text-[10px] text-zinc-400">
                                    SKU: {prod.sku}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-zinc-600 font-medium">
                              {prod.category}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                                {prod.variants?.length || 0} configurations
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`font-semibold ${
                                  prod.stock === 0
                                    ? 'text-rose-600'
                                    : prod.stock <= prod.lowStockThreshold
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                }`}
                              >
                                {prod.stock} in stock
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-zinc-900">
                              {formatPrice(prod.price)}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                ACTIVE
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDuplicate(prod.id)}
                                  className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                                  title="Duplicate Product (Clone with new SKU)"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <Link
                                  href={`/products/${prod.id}`}
                                  className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                                  title="View & Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                  onClick={() => handleDelete(prod.id, prod.title)}
                                  className="p-1.5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                                  title="Archive Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STORE BUILDER STUDIO (NEW PHASE 2 REQUIREMENT) */}
            {activeTab === 'store_builder' && (
              <div className="space-y-6">
                {/* Store Sub-tabs */}
                <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 text-xs font-semibold">
                  <button
                    onClick={() => setStoreSubTab('profile')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      storeSubTab === 'profile'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    1. Profile & Branding
                  </button>
                  <button
                    onClick={() => setStoreSubTab('theme')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      storeSubTab === 'theme'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    2. Theme Studio
                  </button>
                  <button
                    onClick={() => setStoreSubTab('sections')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      storeSubTab === 'sections'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    3. Homepage Sections
                  </button>
                  <button
                    onClick={() => setStoreSubTab('analytics')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      storeSubTab === 'analytics'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    4. Analytics & Growth
                  </button>
                  <button
                    onClick={() => setStoreSubTab('reviews')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      storeSubTab === 'reviews'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    5. Store Reviews ({reviewsData.length})
                  </button>
                </div>

                {/* Sub-tab 1: Store Profile & Branding */}
                {storeSubTab === 'profile' && (
                  <form onSubmit={handleSaveStoreProfile} className="space-y-6">
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                      <h3 className="text-sm font-bold text-zinc-900 pb-2 border-b border-zinc-100">
                        Brand Identity & Contact Settings
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Store Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={storeData.name}
                            onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Unique Store URL Slug *
                          </label>
                          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500 font-mono text-[11px]">
                            <span>marketai.com/store/</span>
                            <input
                              type="text"
                              required
                              value={storeData.slug}
                              onChange={(e) =>
                                setStoreData({
                                  ...storeData,
                                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                                })
                              }
                              className="bg-transparent text-zinc-900 font-bold outline-none flex-1 ml-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1">
                          Store Description / Tagline
                        </label>
                        <textarea
                          rows={3}
                          value={storeData.description}
                          onChange={(e) =>
                            setStoreData({ ...storeData, description: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Business Category
                          </label>
                          <input
                            type="text"
                            value={storeData.businessCategory}
                            onChange={(e) =>
                              setStoreData({ ...storeData, businessCategory: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Contact Email
                          </label>
                          <input
                            type="email"
                            value={storeData.contactEmail}
                            onChange={(e) =>
                              setStoreData({ ...storeData, contactEmail: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="text"
                            value={storeData.contactPhone}
                            onChange={(e) =>
                              setStoreData({ ...storeData, contactPhone: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Store Logo URL
                          </label>
                          <div className="flex items-center gap-3">
                            <img
                              src={storeData.logo}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover border border-zinc-200 shrink-0"
                            />
                            <input
                              type="text"
                              value={storeData.logo}
                              onChange={(e) => setStoreData({ ...storeData, logo: e.target.value })}
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-mono text-[11px]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1">
                            Store Banner URL
                          </label>
                          <div className="flex items-center gap-3">
                            <img
                              src={storeData.banner}
                              alt=""
                              className="h-10 w-16 rounded object-cover border border-zinc-200 shrink-0"
                            />
                            <input
                              type="text"
                              value={storeData.banner}
                              onChange={(e) =>
                                setStoreData({ ...storeData, banner: e.target.value })
                              }
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2"
                        >
                          Save Profile & Branding
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Sub-tab 2: Store Theme Studio */}
                {storeSubTab === 'theme' && (
                  <form onSubmit={handleSaveTheme} className="space-y-6">
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                      <h3 className="text-sm font-bold text-zinc-900 pb-2 border-b border-zinc-100">
                        Color Palette & Typography System
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-2">
                            Primary Brand Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={themeData.primaryColor}
                              onChange={(e) =>
                                setThemeData({ ...themeData, primaryColor: e.target.value })
                              }
                              className="h-10 w-14 rounded cursor-pointer border border-zinc-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={themeData.primaryColor}
                              onChange={(e) =>
                                setThemeData({ ...themeData, primaryColor: e.target.value })
                              }
                              className="rounded-lg border border-zinc-200 px-3 py-2 font-mono text-zinc-900 outline-none focus:border-indigo-600 w-32"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-zinc-700 block mb-2">
                            Secondary Accent Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={themeData.secondaryColor}
                              onChange={(e) =>
                                setThemeData({ ...themeData, secondaryColor: e.target.value })
                              }
                              className="h-10 w-14 rounded cursor-pointer border border-zinc-200 p-0.5"
                            />
                            <input
                              type="text"
                              value={themeData.secondaryColor}
                              onChange={(e) =>
                                setThemeData({ ...themeData, secondaryColor: e.target.value })
                              }
                              className="rounded-lg border border-zinc-200 px-3 py-2 font-mono text-zinc-900 outline-none focus:border-indigo-600 w-32"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-2">
                            Store Layout Style
                          </label>
                          <select
                            value={themeData.layoutType}
                            onChange={(e) =>
                              setThemeData({ ...themeData, layoutType: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                          >
                            <option value="Modern">Modern (Glassmorphism & Crisp Spacing)</option>
                            <option value="Minimal">Minimal (Clean Monochrome Focus)</option>
                            <option value="Bold">Bold (Vibrant High-Contrast Accent)</option>
                            <option value="Elegant">Elegant (Refined Luxury Typography)</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-zinc-700 block mb-2">
                            Font Typography
                          </label>
                          <select
                            value={themeData.fontStyle}
                            onChange={(e) =>
                              setThemeData({ ...themeData, fontStyle: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                          >
                            <option value="Inter">Inter (Clean Modern Sans-Serif)</option>
                            <option value="Roboto">Roboto (Technical & Crisp)</option>
                            <option value="Outfit">Outfit (Geometric & Trendy)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2"
                        >
                          Apply Theme Settings
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Sub-tab 3: Homepage Configurable Sections */}
                {storeSubTab === 'sections' && (
                  <form onSubmit={handleSaveSections} className="space-y-6">
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900">
                            Configurable Homepage Section Blocks
                          </h3>
                          <p className="text-zinc-500">
                            Enable, disable, and order content sections shown on your public
                            storefront.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {sectionsData.map((sec, idx) => (
                          <div
                            key={sec.id}
                            className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-zinc-400 text-xs">#{idx + 1}</span>
                              <div>
                                <span className="font-bold text-zinc-900 block">{sec.title}</span>
                                <span className="text-[11px] text-zinc-500">{sec.subtitle}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sec.enabled}
                                  onChange={(e) => {
                                    const updated = [...sectionsData];
                                    updated[idx].enabled = e.target.checked;
                                    setSectionsData(updated);
                                  }}
                                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-semibold text-zinc-700">
                                  {sec.enabled ? 'Enabled' : 'Hidden'}
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-zinc-100 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2"
                        >
                          Save Section Layout
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Sub-tab 4: Store Analytics */}
                {storeSubTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-zinc-500 uppercase">
                          Total Visitors
                        </span>
                        <div className="text-2xl font-black text-zinc-900 mt-1">
                          {analyticsData.views}
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-zinc-500 uppercase">
                          Converted Orders
                        </span>
                        <div className="text-2xl font-black text-zinc-900 mt-1">
                          {analyticsData.orders}
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-zinc-500 uppercase">
                          Gross Revenue
                        </span>
                        <div className="text-2xl font-black text-zinc-900 mt-1">
                          ${analyticsData.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
                      <h3 className="text-sm font-bold text-zinc-900">Top Performing Products</h3>
                      <div className="divide-y divide-zinc-100">
                        {analyticsData.topProducts.map((tp: any, i: number) => (
                          <div key={i} className="py-3 flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-900">{tp.name}</span>
                            <div className="flex items-center gap-4 text-zinc-600">
                              <span>{tp.units} units sold</span>
                              <span className="font-bold text-zinc-900">
                                ${tp.revenue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 5: Store Reviews Moderation */}
                {storeSubTab === 'reviews' && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4 text-xs">
                    <h3 className="text-sm font-bold text-zinc-900 pb-2 border-b border-zinc-100">
                      Verified Customer Store Reviews
                    </h3>

                    <div className="divide-y divide-zinc-100">
                      {reviewsData.map((rev) => (
                        <div key={rev.id} className="py-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900">{rev.user?.name}</span>
                            <span className="text-[10px] text-zinc-400">{rev.createdAt}</span>
                          </div>
                          <div className="flex items-center text-amber-500 text-xs">
                            {'★'.repeat(rev.rating)}
                            {'☆'.repeat(5 - rev.rating)}
                          </div>
                          <p className="text-zinc-600 mt-1">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: INVENTORY & AUDIT TRAIL */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                {/* Low Stock Warning Banner */}
                {inventoryOverview && inventoryOverview.lowStockItems.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-amber-900">
                        Low Stock Attention Required ({inventoryOverview.lowStockItems.length}{' '}
                        products)
                      </h4>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        The following catalog items are near or below reorder threshold:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {inventoryOverview.lowStockItems.map((item) => (
                          <span
                            key={item.productId}
                            className="rounded-md bg-white border border-amber-300 px-2 py-0.5 text-[10px] font-semibold text-amber-900 shadow-2xs"
                          >
                            {item.title} ({item.stockQuantity} left)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Transactions Audit Table */}
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                  <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        Inventory Transaction Ledger
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Audit log of restock additions (+100), sales deductions (-5), and return
                        adjustments (+2).
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRestockModal(true)}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs"
                    >
                      + Add Stock Movement
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Product / Variant</th>
                          <th className="py-3 px-4">Action Type</th>
                          <th className="py-3 px-4">Delta</th>
                          <th className="py-3 px-4">Previous &rarr; New</th>
                          <th className="py-3 px-4">Reference / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {transactions.map((txn) => {
                          const isPositive = txn.quantity > 0;
                          return (
                            <tr key={txn.id} className="hover:bg-zinc-50/50">
                              <td className="py-3 px-4 text-zinc-500">
                                {formatDate(txn.createdAt)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-zinc-900 block">
                                  {txn.inventory?.product?.title || 'Catalog Product'}
                                </span>
                                {txn.inventory?.variant?.title && (
                                  <span className="text-[10px] text-zinc-400">
                                    {txn.inventory.variant.title}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    txn.type === 'RESTOCK'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : txn.type === 'ORDER_DEDUCTION'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {txn.type}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`font-mono font-bold ${
                                    isPositive ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {isPositive ? `+${txn.quantity}` : txn.quantity}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-zinc-600">
                                {txn.previousStock} &rarr; {txn.newStock}
                              </td>
                              <td className="py-3 px-4 text-zinc-500">
                                <span className="font-mono text-[11px] text-zinc-700 block">
                                  {txn.referenceId || 'N/A'}
                                </span>
                                <span className="text-[10px] text-zinc-400">{txn.note}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FULFILLMENT HUB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900">Incoming Customer Orders</h3>
                {sellerOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
                    No orders received yet. Place an order on the storefront to test fulfillment
                    actions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sellerOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 text-xs">
                          <div>
                            <span className="font-mono font-bold text-zinc-900">
                              Order #{order.orderNumber}
                            </span>
                            <span className="text-zinc-400 ml-2">{formatDate(order.placedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                order.status === 'DELIVERED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : order.status === 'SHIPPED'
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {order.status}
                            </span>
                            <span className="font-bold text-zinc-900">
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2 text-xs">
                          {order.items?.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-zinc-700"
                            >
                              <span>
                                {item.quantity}x {item.productTitle}{' '}
                                {item.variantTitle && `(${item.variantTitle})`}
                              </span>
                              <span className="font-semibold text-zinc-900">
                                {formatPrice(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Seller Order Actions */}
                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2 text-xs">
                          {order.status === 'PAID' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'PROCESSING')}
                              className="rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-3 py-1.5"
                            >
                              Accept Order & Start Processing
                            </button>
                          )}
                          {order.status === 'PROCESSING' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5"
                            >
                              Dispatch & Mark as Shipped
                            </button>
                          )}
                          {order.status === 'SHIPPED' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5"
                            >
                              Confirm Final Delivery
                            </button>
                          )}
                          {order.status === 'DELIVERED' && (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Delivered & Escrow Released
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: BILLING & SUBSCRIPTION (PHASE 4 SAAS REQUIREMENT) */}
            {activeTab === 'billing' && (
              <div
                id="billing-subscription-tab"
                data-testid="billing-subscription-tab"
                className="space-y-6"
              >
                {/* Active Plan Overview Card */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900">
                          Current Subscription Plan
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                            billingData?.subscription?.plan?.tier === 'PRO'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}
                        >
                          {billingData?.subscription?.plan?.tier || 'PRO'} PLAN
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {billingData?.subscription?.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Billed through Stripe Automated Subscription Billing. Next renewal date:{' '}
                        {billingData?.subscription?.endDate
                          ? formatDate(billingData.subscription.endDate)
                          : 'Oct 25, 2026'}
                        .
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 text-xs shadow-2xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Change / Upgrade Plan</span>
                      </Link>
                      {billingData?.subscription?.plan?.tier === 'PRO' && (
                        <button
                          type="button"
                          disabled={isCancellingSub}
                          onClick={async () => {
                            if (
                              confirm(
                                'Are you sure you want to cancel your PRO subscription? You will lose unlimited products and AI Copilot access at period end.',
                              )
                            ) {
                              setIsCancellingSub(true);
                              try {
                                await cancelSellerSubscription();
                                showToast('Subscription scheduled for cancellation at period end.');
                                await loadData();
                              } catch {
                                showToast('Failed to cancel subscription');
                              } finally {
                                setIsCancellingSub(false);
                              }
                            }
                          }}
                          className="rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-semibold px-3 py-2 text-xs transition-colors"
                        >
                          {isCancellingSub ? 'Cancelling...' : 'Cancel Subscription'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Usage Quota Progress Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800">Catalog Product Limit</span>
                        <span className="font-mono text-zinc-600 font-semibold">
                          {billingData?.usage?.productsCount || products.length} /{' '}
                          {billingData?.usage?.productLimit === -1
                            ? 'Unlimited'
                            : billingData?.usage?.productLimit || 20}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{
                            width:
                              billingData?.usage?.productLimit === -1
                                ? '15%'
                                : `${Math.min(100, ((billingData?.usage?.productsCount || products.length) / (billingData?.usage?.productLimit || 20)) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>
                          {billingData?.usage?.productLimit === -1
                            ? 'PRO Unlimited Tier Active'
                            : 'FREE Tier Limit (20 max)'}
                        </span>
                        <span>
                          {billingData?.usage?.productLimit === -1
                            ? 'No Cap'
                            : 'Upgrade for Unlimited'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800">
                          AI Copilot & Vision Analyzer
                        </span>
                        <span className="font-mono text-emerald-600 font-bold">UNRESTRICTED</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full w-full" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Full Autonomous Catalog Intelligence</span>
                        <span>PRO Benefit</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan Feature Entitlements Checklist */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                      Plan Inclusions & Permissions
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {[
                        'Unlimited Product Listings',
                        'AI Seller Copilot & Vision Analyzer',
                        'Store Builder Themes & CSS Customization',
                        'Stripe & SSLCommerz Payment Gateway',
                        'Dedicated Escrow & Settlement Audit',
                        'Real-time Inventory Ledger',
                        'Priority Seller Support (24/7)',
                        'Export Financial Statements',
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-700">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Billing History & Invoices */}
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                  <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        Billing History & Tax Invoices
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Download official VAT receipts and view recurring invoice statements
                      </p>
                    </div>
                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                      Auto-Debit Enabled
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Invoice ID</th>
                          <th className="py-3 px-4">Billing Date</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                        {billingData?.invoices && billingData.invoices.length > 0 ? (
                          billingData.invoices.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-zinc-50/50">
                              <td className="py-3.5 px-4 font-bold text-zinc-900">{inv.id}</td>
                              <td className="py-3.5 px-4 text-zinc-600 font-sans">
                                {formatDate(inv.date)}
                              </td>
                              <td className="py-3.5 px-4 font-sans text-zinc-800">
                                {inv.description}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-900">
                                {formatPrice(inv.amount)}
                              </td>
                              <td className="py-3.5 px-4 text-zinc-600 font-sans">
                                {inv.cardBrand
                                  ? `${inv.cardBrand} •••• ${inv.cardLast4}`
                                  : 'Stripe Card'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <a
                                  href={inv.pdfUrl || '#'}
                                  onClick={(e) => {
                                    if (!inv.pdfUrl) {
                                      e.preventDefault();
                                      showToast('Official PDF Invoice downloaded');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 font-sans"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </a>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr className="hover:bg-zinc-50/50">
                              <td className="py-3.5 px-4 font-bold text-zinc-900">INV-2026-0925</td>
                              <td className="py-3.5 px-4 text-zinc-600 font-sans">Sep 25, 2026</td>
                              <td className="py-3.5 px-4 font-sans text-zinc-800">
                                DokanOS PRO Seller Plan (Monthly)
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-900">$19.00 USD</td>
                              <td className="py-3.5 px-4 text-zinc-600 font-sans">
                                Visa •••• 4242
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  PAID
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    showToast('Official PDF Invoice INV-2026-0925 downloaded')
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 font-sans"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>
                              </td>
                            </tr>
                            <tr className="hover:bg-zinc-50/50">
                              <td className="py-3.5 px-4 font-bold text-zinc-900">INV-2026-0825</td>
                              <td className="py-3.5 px-4 text-zinc-600 font-sans">Aug 25, 2026</td>
                              <td className="py-3.5 px-4 font-sans text-zinc-800">
                                DokanOS PRO Seller Plan (Monthly)
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-900">$19.00 USD</td>
                              <td className="py-3.5 px-4 text-zinc-600 font-sans">
                                Visa •••• 4242
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  PAID
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    showToast('Official PDF Invoice INV-2026-0825 downloaded')
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 font-sans"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: ADVANCED BUSINESS INTELLIGENCE & ANALYTICS */}
            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                onNotify={showToast}
                defaultStoreId={storeData.id || 'store-apple-zone'}
                isAdmin={false}
              />
            )}

            {/* TAB 8: ADVANCED AI AUTOMATION & COPILOT (PHASE 9) */}
            {activeTab === 'ai_copilot' && (
              <div className="space-y-6">
                <AISalesCopilot />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Restock & Adjustment Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">Adjust Inventory Stock</h3>
              <button
                onClick={() => setShowRestockModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Select Product *</label>
                <select
                  required
                  value={selectedProductForRestock}
                  onChange={(e) => {
                    setSelectedProductForRestock(e.target.value);
                    setSelectedVariantForRestock('');
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                >
                  <option value="">-- Choose Product SKU --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.stock} units currently)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductForRestock && (
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">
                    Specific Variant (Optional)
                  </label>
                  <select
                    value={selectedVariantForRestock}
                    onChange={(e) => setSelectedVariantForRestock(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                  >
                    <option value="">All Variants / Main Product</option>
                    {products
                      .find((p) => p.id === selectedProductForRestock)
                      ?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} ({v.stockQuantity} in stock)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Quantity Delta (+100 for restock, -5 for damage/loss) *
                </label>
                <input
                  type="number"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Reason / Reference Note
                </label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="e.g. Received PO-2026-904 from factory"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-1.5 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5"
                >
                  {isSubmittingRestock ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">List New Marketplace Product</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-4 text-xs">
              {/* AI Copilot & Vision Analyzer Helper Banners */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Seller Copilot & Vision Assist</span>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                    Phase 3
                  </span>
                </div>

                {/* AI Image Analyzer Bar */}
                <div className="space-y-1.5 pt-1 border-t border-indigo-100/60">
                  <label className="text-[11px] font-semibold text-zinc-700 block">
                    Product Image (Vision AI Image Analyzer)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={productImageUrl}
                      onChange={(e) => setProductImageUrl(e.target.value)}
                      placeholder="Paste image URL (Unsplash or CDN)..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-900 outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      disabled={isAnalyzingImage}
                      onClick={handleAnalyzeImage}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold px-3 py-1.5 shrink-0 transition-colors"
                    >
                      {isAnalyzingImage ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3 h-3" />
                          <span>Analyze Vision</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sample Presets */}
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-zinc-500">
                    <span>Try sample:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProductImageUrl(
                          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
                        );
                        setNewTitle('Nike Air Max Sport');
                      }}
                      className="underline hover:text-indigo-600"
                    >
                      👟 Sport Shoe
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProductImageUrl(
                          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
                        );
                        setNewTitle('Sony Studio Headphones');
                      }}
                      className="underline hover:text-indigo-600"
                    >
                      🎧 Headphones
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProductImageUrl(
                          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
                        );
                        setNewTitle('MacBook Pro M3');
                      }}
                      className="underline hover:text-indigo-600"
                    >
                      💻 Laptop
                    </button>
                  </div>
                </div>

                {/* AI Copilot Action Button */}
                <div className="flex items-center justify-between pt-1 border-t border-indigo-100/60">
                  <span className="text-[11px] text-zinc-600">
                    Generate SEO title, markdown specs & marketing copy:
                  </span>
                  <button
                    type="button"
                    disabled={isGeneratingCopilot}
                    onClick={handleGenerateCopilot}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 transition-colors shadow-2xs"
                  >
                    {isGeneratingCopilot ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        <span>Generate with Copilot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sony WH-1000XM6 Wireless Headphones"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                  >
                    <option value="Smartphones & Tech">Smartphones & Tech</option>
                    <option value="Audio & Acoustics">Audio & Acoustics</option>
                    <option value="Computer Peripherals">Computer Peripherals</option>
                    <option value="Footwear & Apparel">Footwear & Apparel</option>
                    <option value="Home & Ergonomics">Home & Ergonomics</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Base SKU</label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="e.g. SNY-XM6-BASE"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">
                    Selling Price ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">
                    Initial Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-zinc-700">
                    Product Description (Markdown Enabled)
                  </label>
                  {aiMarketingCopy && (
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      AI Marketing snippet active
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Key features, technical details, box contents..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-mono text-[11px]"
                />
              </div>

              {/* AI Generated Tags Preview */}
              {aiGeneratedTags.length > 0 && (
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">
                    AI Detected SEO Tags & Keywords
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {aiGeneratedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-1.5 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 shadow-2xs"
                >
                  Create & List Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
