'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sparkles,
  Check,
  Store,
  Star,
  PackageCheck,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { NaturalSearchBar } from '@/components/ai/natural-search-bar';
import { PersonalizedRecommendationsSection } from '@/components/ai/personalized-recommendations';
import { fetchProducts } from '@/lib/api-client';
import { Product, CATEGORIES } from '@/lib/mock-data';
import { useCart } from '@/lib/cart-context';
import { formatPrice, getStoreName } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts({ limit: 6, sortBy: 'popular' }).then((res) => {
      setProducts(res.data);
      setIsLoading(false);
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/products');
    }
  };

  const handleQuickAdd = (product: Product) => {
    addToCart(product, 1);
    setToastMessage(`Added "${product.title}" to cart`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Floating Cart Toast */}
      {toastMessage && (
        <div
          id="cart-toast"
          data-testid="cart-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-3 h-3" />
          </div>
          <span>{toastMessage}</span>
          <Link
            href="/cart"
            className="ml-2 font-semibold text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
          >
            View Cart
          </Link>
        </div>
      )}

      {/* Main Content with a11y anchor */}
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-b from-zinc-50/80 via-white to-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3.5 py-1 text-xs font-medium text-indigo-700 shadow-xs mb-6">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>DokanOS 2.0 • Autonomous Multi-Vendor Commerce Platform</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                The marketplace platform for modern commerce.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto">
                Browse verified multi-vendor products with real-time variant inventories, atomic
                multi-store checkout, and escrow-backed fulfillment.
              </p>

              {/* AI Natural Language Search Assistant (Phase 9) */}
              <div className="mt-8">
                <NaturalSearchBar />
              </div>

              {/* Category Quick Tags */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">Popular:</span>
                {CATEGORIES.slice(1, 5).map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/products?categorySlug=${cat.slug}`}
                    className="rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 px-3 py-1 text-zinc-600 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Value Propositions */}
        <section className="border-b border-zinc-200/80 bg-zinc-50/50 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Multi-Vendor Escrow</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Payments are locked in escrow and only disbursed upon verified courier delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Atomic Variant Inventory</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Accurate SKU-level variant stock tracking prevents overselling across all
                    stores.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Seller SaaS Suite</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Enterprise dashboard with sales analytics, inventory restock logs, and order
                    fulfillment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products Catalog */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Marketplace Highlights
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
                  Featured Verified Products
                </h2>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <span>Explore all items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 animate-pulse"
                  >
                    <div className="aspect-4/3 w-full rounded-lg bg-zinc-100" />
                    <div className="h-4 w-2/3 rounded bg-zinc-100" />
                    <div className="h-3 w-1/3 rounded bg-zinc-100" />
                    <div className="h-5 w-1/4 rounded bg-zinc-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  return (
                    <div
                      key={product.id}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md transition-all duration-200"
                    >
                      {/* Image Area */}
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
                        <img
                          src={product.primaryImage}
                          alt={product.title}
                          className="h-full w-full object-cover object-center group-hover:scale-103 transition-transform duration-300"
                        />
                        {product.badge && (
                          <span className="absolute top-2.5 left-2.5 rounded-md bg-zinc-900/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                            {product.badge}
                          </span>
                        )}
                        {hasVariants && (
                          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-white/95 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 shadow-2xs">
                            {product.variants.length} Variants
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-4">
                        {/* Store & Category */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
                          <span className="flex items-center gap-1 font-medium text-zinc-700">
                            <Store className="w-3 h-3 text-zinc-400" />
                            {getStoreName((product as any).storeName || (product as any).store)}
                          </span>
                          <div className="flex items-center gap-1 text-amber-500 font-medium">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{product.rating}</span>
                            <span className="text-zinc-400">({product.reviewCount})</span>
                          </div>
                        </div>

                        {/* Title */}
                        <Link href={`/products/${product.id}`} className="focus:outline-none">
                          <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {product.title}
                          </h3>
                        </Link>

                        {/* Description */}
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Price and CTA */}
                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                          <div>
                            <span className="text-base font-bold text-zinc-900">
                              {formatPrice(product.price)}
                            </span>
                            {product.compareAtPrice && (
                              <span className="ml-1.5 text-xs text-zinc-400 line-through">
                                {formatPrice(product.compareAtPrice)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/products/${product.id}`}
                              className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors shadow-2xs"
                            >
                              Details
                            </Link>
                            <button
                              onClick={() => handleQuickAdd(product)}
                              className="flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors shadow-2xs"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Personalized AI Product Recommendations (Phase 9) */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <PersonalizedRecommendationsSection limit={6} />
          </div>
        </section>

        {/* Seller Portal Callout Banner */}
        <section className="border-t border-zinc-200/80 bg-zinc-50/60 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  For Marketplace Vendors
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mt-1">
                  Grow your multi-vendor storefront on DokanOS.
                </h3>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
                  Take advantage of automated inventory audit trails, multi-variant SKU
                  configuration, and direct order fulfillment management from our SaaS dashboard.
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-zinc-600">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Automated Restock Tracking
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> One-Click Product Duplicate
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Link
                  href="/seller/dashboard"
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition-colors shadow-xs"
                >
                  <span>Launch Seller Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/products"
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-6 py-3 text-xs sm:text-sm font-semibold text-zinc-700 transition-colors"
                >
                  <span>Browse Marketplace</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
