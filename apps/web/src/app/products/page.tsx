'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Star,
  Store,
  ShoppingBag,
  Check,
  Package,
  ArrowUpDown,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { fetchProducts } from '@/lib/api-client';
import { Product, CATEGORIES } from '@/lib/mock-data';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/utils';

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();

  // Search & Filter State
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('categorySlug') || 'all';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular'
  >('newest');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load products based on query state
  useEffect(() => {
    setIsLoading(true);
    fetchProducts({
      search: searchQuery || undefined,
      categorySlug: selectedCategory !== 'all' ? selectedCategory : undefined,
      minPrice,
      maxPrice,
      minRating,
      inStock: inStockOnly || undefined,
      sortBy,
    }).then((res) => {
      setProducts(res.data);
      setIsLoading(false);
    });
  }, [searchQuery, selectedCategory, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  const handleQuickAdd = (product: Product) => {
    addToCart(product, 1);
    setToastMessage(`Added "${product.title}" to cart`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(undefined);
    setInStockOnly(false);
    setSortBy('newest');
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'all' ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    minRating !== undefined ||
    inStockOnly;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      {/* Cart Toast Notification */}
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

      {/* Main Catalog Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Breadcrumbs & Search Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Curated Electronics & Workspace Hardware
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Showing {products.length} products with real-time verified vendor inventory.
            </p>
          </div>

          {/* Controls: Search & Sort */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="product-search-input"
                data-testid="product-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or SKUs..."
                className="w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-indigo-600 shadow-2xs cursor-pointer"
              >
                <option value="newest">Sort: Newest</option>
                <option value="popular">Sort: Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Rating: Highest</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Content Layout: Sidebar + Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <aside className={`lg:block ${mobileFilterOpen ? 'block' : 'hidden'} space-y-6`}>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filters
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-2.5">Category</label>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      data-testid={`category-filter-btn-${cat.slug}`}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        selectedCategory === cat.slug
                          ? 'bg-indigo-50 font-semibold text-indigo-700'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-zinc-400">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="pt-4 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-900 block mb-2.5">
                  Price Range ($)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice ?? ''}
                    onChange={(e) =>
                      setMinPrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-600"
                  />
                  <span className="text-zinc-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice ?? ''}
                    onChange={(e) =>
                      setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="pt-4 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-900 block mb-2.5">
                  Minimum Rating
                </label>
                <div className="space-y-1.5">
                  {[4.5, 4.0, 3.5].map((ratingVal) => (
                    <button
                      key={ratingVal}
                      onClick={() => setMinRating(minRating === ratingVal ? undefined : ratingVal)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        minRating === ratingVal
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{ratingVal} Stars & above</span>
                      </div>
                      {minRating === ratingVal && <Check className="w-3 h-3 text-amber-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="pt-4 border-t border-zinc-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Product Cards Grid Area (3 Cols) */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="min-h-[350px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  No products matched your criteria
                </h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                  Try adjusting or resetting your search keywords, price limits, or category filter
                  options.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-5 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  return (
                    <div
                      key={product.id}
                      data-testid="product-card"
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md transition-all duration-200"
                    >
                      {/* Thumbnail with tags */}
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
                        <span className="absolute top-2.5 right-2.5 rounded-md bg-white/90 border border-zinc-200 px-2 py-0.5 text-[10px] font-mono text-zinc-600 shadow-2xs">
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-4">
                        {/* Store and Rating Header */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
                          <span className="flex items-center gap-1 font-medium text-zinc-700">
                            <Store className="w-3 h-3 text-zinc-400" />
                            {product.storeName}
                          </span>
                          <div className="flex items-center gap-1 text-amber-500 font-medium">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{product.rating}</span>
                            <span className="text-zinc-400">({product.reviewCount})</span>
                          </div>
                        </div>

                        {/* Title */}
                        <Link href={`/products/${product.id}`} className="focus:outline-none">
                          <h3
                            data-testid="product-title"
                            className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1"
                          >
                            {product.title}
                          </h3>
                        </Link>

                        {/* Description */}
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Price and Cart Footer */}
                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100">
                          <div>
                            <span
                              data-testid="product-price"
                              className="text-base font-bold text-zinc-900"
                            >
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
                              View
                            </Link>
                            <button
                              data-testid="add-to-cart-btn"
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
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-medium text-zinc-500">Loading catalog...</p>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </React.Suspense>
  );
}
