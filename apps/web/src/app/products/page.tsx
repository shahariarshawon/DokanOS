'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ShoppingBag,
  Star,
  CheckCircle2,
  Sparkles,
  Store,
  BarChart3,
  User,
} from 'lucide-react';
import { MOCK_PRODUCTS, Product } from '@/lib/mock-data';
import { useCart } from '@/lib/cart-context';

export default function ProductsPage() {
  const { addToCart, itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = ['All', 'Laptops & Tech', 'Audio', 'Accessories', 'Home Office'];

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.storeName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'All' || product.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setToastMessage(`Added "${product.title}" to cart!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="cart-toast"
          data-testid="cart-toast"
          className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-3 animate-fade-in border border-indigo-400/40"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
          <Link href="/cart" className="underline ml-2 hover:text-indigo-200 transition-colors">
            View Cart
          </Link>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              D
            </div>
            <span className="font-bold text-lg tracking-tight text-white">DokanOS</span>
          </Link>
          <span className="hidden md:inline-block text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
            Marketplace Catalog
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Seller BI</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors"
          >
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sign In</span>
          </Link>

          <Link
            id="header-cart-btn"
            data-testid="header-cart-btn"
            href="/cart"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            <span
              id="cart-count-badge"
              data-testid="cart-count-badge"
              className="px-1.5 py-0.5 rounded-full bg-white/20 text-[11px] font-mono"
            >
              {itemCount}
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-zinc-800 p-6 sm:p-8">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              <span>Multi-Vendor Discovery Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Curated Electronics & Workspace Hardware
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Direct from verified sellers. Powered by autonomous inventory verification and AI
              search.
            </p>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl backdrop-blur">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="product-search-input"
              data-testid="product-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, specs, or vendor..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                data-testid={`category-filter-btn-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span id="products-count" data-testid="products-count">
            Showing <strong className="text-white">{filteredProducts.length}</strong> products
          </span>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-indigo-400 hover:underline">
              Clear search filter
            </button>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              data-testid="product-card"
              className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header: Store & Badge */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Store className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{product.storeName}</span>
                  </span>
                  {product.badge && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  data-testid="product-title"
                  className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2"
                >
                  {product.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800/80">
                <div className="flex items-baseline justify-between mb-3">
                  <span
                    data-testid="product-price"
                    className="text-lg font-bold text-white font-mono"
                  >
                    ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>

                  <div className="flex items-center gap-1 text-amber-400 text-xs font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{product.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span
                    data-testid="stock-badge"
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      product.stock > 10
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {product.stock} in stock
                  </span>

                  <button
                    id={`add-to-cart-${product.id}`}
                    data-testid="add-to-cart-btn"
                    onClick={() => handleAddToCart(product)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
