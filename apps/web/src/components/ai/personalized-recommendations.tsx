'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ShoppingBag, ArrowRight, Star, Heart, Flame, Compass } from 'lucide-react';
import {
  fetchPersonalizedRecommendations,
  PersonalizedRecommendationItem,
  PersonalizedRecommendationsResponse,
} from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';

export function PersonalizedRecommendationsSection({ limit = 6 }: { limit?: number }) {
  const [data, setData] = useState<PersonalizedRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPersonalizedRecommendations(limit)
      .then((res) => {
        setData(res);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  const handleAddToCart = (item: PersonalizedRecommendationItem) => {
    addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.imageUrl || '/placeholder.png',
      storeName: 'Verified Partner Store',
      quantity: 1,
    } as any);

    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2000);
  };

  if (loading) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-md" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.recommendations.length === 0) return null;

  return (
    <section className="my-10 bg-gradient-to-b from-indigo-50/40 via-white to-white p-6 sm:p-8 rounded-3xl border border-indigo-100/70 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 bg-indigo-100 text-indigo-700 rounded-md">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Personalized For You
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Curated Recommendations
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Tuned with vector similarity and your shopping interests (
            {data.sourceSummary.viewedCount} products explored).
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Explore Full Catalog
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {data.recommendations.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between bg-white rounded-2xl border border-gray-200/80 p-3.5 hover:shadow-md hover:border-indigo-200 transition-all duration-200"
          >
            <div>
              {/* Badge */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    item.recommendationSource === 'USER_BEHAVIOR'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : item.recommendationSource === 'EMBEDDING_SIMILARITY'
                        ? 'bg-purple-50 text-purple-700 border border-purple-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}
                >
                  {item.recommendationSource === 'USER_BEHAVIOR' && (
                    <Compass className="w-2.5 h-2.5" />
                  )}
                  {item.recommendationSource === 'EMBEDDING_SIMILARITY' && (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                  {item.recommendationSource === 'BUSINESS_TREND' && (
                    <Flame className="w-2.5 h-2.5" />
                  )}
                  {item.recommendationSource === 'USER_BEHAVIOR'
                    ? 'For You'
                    : item.recommendationSource === 'EMBEDDING_SIMILARITY'
                      ? 'Vector Match'
                      : 'Trending'}
                </span>
                <span className="text-[10px] font-semibold text-gray-400">
                  {Math.round(item.similarityScore * 100)}% match
                </span>
              </div>

              {/* Image Preview */}
              <div className="relative aspect-square w-full rounded-xl bg-slate-50 overflow-hidden mb-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Title & Category */}
              <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-0.5">
                {item.category}
              </span>
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                {item.title}
              </h4>

              {/* Explanation Note */}
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">
                "{item.explanation}"
              </p>
            </div>

            {/* Price and Cart Action */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-bold text-gray-900 block">
                  {formatPrice(item.price)}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                  <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                  <span>{item.rating}</span>
                </div>
              </div>

              <button
                onClick={() => handleAddToCart(item)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  addedIds[item.id]
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white'
                }`}
                title="Add to Cart"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
