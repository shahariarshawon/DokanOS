'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  DollarSign,
  Tag,
  Target,
  ArrowRight,
  ShoppingBag,
  Star,
  CheckCircle,
  X,
} from 'lucide-react';
import { executeNaturalSearch, NaturalSearchResponse } from '@/lib/api-client';
import { formatPrice, getCategoryName } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';

export function NaturalSearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NaturalSearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { addToCart } = useCart();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const sampleQueries = [
    'I need affordable shoes for running under $100',
    'Best laptop for programming with 16GB RAM',
    'Wireless noise cancelling headphones for travel',
    'Minimalist mechanical keyboard under $90',
  ];

  const handleSearch = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim() || loading) return;
    setLoading(true);
    setIsOpen(true);
    try {
      const res = await executeNaturalSearch(q);
      setResult(res);
    } catch {
      // Handled in client
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (p: any) => {
    addToCart({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.primaryImage || '/placeholder.png',
      storeName: 'Verified Merchant',
      quantity: 1,
    } as any);

    setAddedIds((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false }));
    }, 2000);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative flex items-center shadow-md hover:shadow-lg transition-all rounded-2xl bg-white border-2 border-indigo-500/30 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100 p-1.5">
        <div className="pl-3 text-indigo-500">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Describe what you want naturally (e.g., 'affordable shoes for running under $100')..."
          className="w-full px-3 py-2.5 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResult(null);
              setIsOpen(false);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors mr-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Search</span>
        </button>
      </div>

      {/* Suggested Natural Prompts */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 px-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Try Natural Prompts:
        </span>
        {sampleQueries.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(sample);
              handleSearch(sample);
            }}
            className="text-xs px-2.5 py-1 bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-lg border border-slate-200/60 transition-colors cursor-pointer"
          >
            "{sample}"
          </button>
        ))}
      </div>

      {/* Results Dropdown / Modal */}
      {isOpen && result && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2">
          {/* Extracted Intent Pill Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl mb-4">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              AI Extracted Intent:
            </span>

            {result.extractedIntent.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-indigo-200 text-indigo-800 rounded-full text-xs font-medium">
                <Tag className="w-3 h-3 text-indigo-500" />
                Category: {getCategoryName(result.extractedIntent.category)}
              </span>
            )}

            {result.extractedIntent.maxBudget && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                Budget: &le; {formatPrice(result.extractedIntent.maxBudget)}
              </span>
            )}

            {result.extractedIntent.purpose && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-purple-200 text-purple-800 rounded-full text-xs font-medium">
                <Target className="w-3 h-3 text-purple-600" />
                Purpose: {result.extractedIntent.purpose}
              </span>
            )}

            {result.extractedIntent.preference && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-amber-200 text-amber-800 rounded-full text-xs font-medium">
                Tone: {result.extractedIntent.preference}
              </span>
            )}
          </div>

          {/* AI Summary */}
          <p className="text-xs text-gray-600 mb-4 italic">"{result.aiSummary}"</p>

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {result.products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-xs transition-all bg-slate-50/50"
              >
                <div>
                  <div className="relative aspect-video w-full rounded-lg bg-white overflow-hidden mb-2">
                    {p.primaryImage ? (
                      <img
                        src={p.primaryImage}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-indigo-600">
                    {getCategoryName(p.category)}
                  </span>
                  <h5 className="text-xs font-semibold text-gray-900 line-clamp-1">{p.title}</h5>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                    {p.matchExplanation}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-900">{formatPrice(p.price)}</span>
                    <span className="text-[10px] text-gray-400 block">
                      {Math.round(p.matchScore * 100)}% match
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(p)}
                    className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      addedIds[p.id]
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Found {result.totalFound} AI-verified matches</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Close Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
