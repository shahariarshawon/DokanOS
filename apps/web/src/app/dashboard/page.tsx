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
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  fetchProducts,
  fetchInventoryOverview,
  fetchInventoryTransactions,
  duplicateProduct,
  deleteProduct,
  adjustInventoryStock,
  InventoryOverview,
  InventoryTransactionItem,
} from '@/lib/api-client';
import { Product, ProductVariant } from '@/lib/mock-data';
import { formatPrice, formatDate } from '@/lib/utils';

export default function SellerDashboardPage() {
  const [dashboardView, setDashboardView] = useState<'seller' | 'admin'>('seller');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'orders' | 'analytics'>(
    'products',
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Orders State (for Fulfillment Tab)
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, invRes, txnRes] = await Promise.all([
        fetchProducts({ limit: 50 }),
        fetchInventoryOverview(),
        fetchInventoryTransactions(),
      ]);
      setProducts(prodRes.data);
      setInventoryOverview(invRes);
      setTransactions(txnRes);

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

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
      storeName: 'My Verified Storefront',
      storeSlug: 'my-verified-storefront',
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
                  Manage multi-variant SKU catalog, real-time inventory adjustments, and orders.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
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

            {/* Overview Metric Cards (Part 7 Requirement & Testing) */}
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
                  <span className="text-xs font-medium uppercase tracking-wider">Net Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-zinc-900">$24,216.50</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                  <TrendingUp className="w-3 h-3" /> Net vendor payout
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

            {/* Inventory Overview (Part 3 Requirement) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Stock</span>
                  <Package className="w-4 h-4 text-zinc-700" />
                </div>
                <div className="text-2xl font-black text-zinc-900">
                  {inventoryOverview?.totalStock ?? 189} units
                </div>
                <div className="mt-2 text-[11px] text-zinc-500">
                  Across {products.length} product SKUs
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Total Products
                  </span>
                  <Package className="w-4 h-4 text-zinc-700" />
                </div>
                <div className="text-2xl font-black text-zinc-900">
                  {inventoryOverview?.totalProducts ?? products.length}
                </div>
                <div className="mt-2 text-[11px] text-zinc-500">Active catalog items</div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Low Stock</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600">
                  {inventoryOverview?.lowStockProducts ?? 1} Low
                </div>
                <div className="mt-2 text-[11px] text-amber-600 font-semibold">Replenish soon</div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Out of Stock</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-rose-600">
                  {inventoryOverview?.outOfStockProducts ?? 0}
                </div>
                <div className="mt-2 text-[11px] text-rose-600 font-semibold">
                  Immediate attention
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-px text-xs font-semibold">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all ${
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
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all ${
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
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all ${
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
            </div>

            {/* TAB 1: PRODUCT MANAGEMENT TABLE (Part 7 Requirement) */}
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
                            {/* Title & Image */}
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

                            {/* Actions (Part 7: Edit, Delete, Duplicate) */}
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

            {/* TAB 2: INVENTORY & AUDIT TRAIL (Part 3 Requirement) */}
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

            {/* TAB 3: FULFILLMENT HUB (Part 5 Requirement) */}
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

                        {/* Seller Order Actions (Part 5 Requirement: Accept, Ship, Complete) */}
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

              {/* Variant option if product has variants */}
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

      {/* Add Product Modal (Part 7 Requirement) */}
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
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sony WH-1000XM6 Wireless Headphones"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
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
                <label className="font-semibold text-zinc-700 block mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Key features, technical details, box contents..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

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
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5"
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
