'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  BarChart3,
  Bot,
  Store,
  HelpCircle,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { fetchSubscriptionPlans, createSubscriptionCheckout } from '@/lib/api-client';

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [activeTier, setActiveTier] = useState<'FREE' | 'PRO'>('PRO');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionPlans().then((data) => {
      setPlans(data);
      setIsLoading(false);
    });

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dokanos_seller_plan');
        if (stored === 'FREE' || stored === 'PRO') {
          setActiveTier(stored);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSelectPlan = async (tier: 'FREE' | 'PRO') => {
    setActionLoading(tier);
    try {
      const res = await createSubscriptionCheckout({
        tier,
        successUrl: `${window.location.origin}/dashboard/billing?status=success&tier=${tier}`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('dokanos_seller_plan', tier);
      }

      if (res.checkoutUrl && res.checkoutUrl.startsWith('http')) {
        window.location.href = res.checkoutUrl;
      } else {
        router.push(`/dashboard/billing?status=activated&tier=${tier}`);
      }
    } catch {
      router.push(`/dashboard/billing?status=activated&tier=${tier}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/80 px-3.5 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>SaaS Infrastructure for Modern Commerce</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900">
            Transparent Pricing for High-Growth Sellers
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl mx-auto">
            Choose the right subscription to unlock automated AI Copilot tools, autonomous product
            vision tagging, custom storefront themes, and scalable revenue operations.
          </p>

          {/* Billing Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3 text-xs font-semibold">
            <span className={billingCycle === 'monthly' ? 'text-zinc-900' : 'text-zinc-500'}>
              Monthly Billing
            </span>
            <button
              onClick={() =>
                setBillingCycle((prev) => (prev === 'monthly' ? 'annually' : 'monthly'))
              }
              className="relative h-6 w-11 rounded-full bg-zinc-900 p-0.5 transition-colors"
            >
              <div
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  billingCycle === 'annually' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={billingCycle === 'annually' ? 'text-zinc-900' : 'text-zinc-500'}>
              Annual (Save 20%)
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* FREE PLAN */}
          <div
            className={`rounded-2xl border bg-white p-8 flex flex-col justify-between transition-all ${
              activeTier === 'FREE'
                ? 'border-zinc-300 ring-2 ring-zinc-900/10 shadow-sm'
                : 'border-zinc-200 shadow-2xs hover:shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Starter Free</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Essential tools for boutique sellers getting started.
                  </p>
                </div>
                {activeTier === 'FREE' && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">$0</span>
                <span className="text-xs text-zinc-500 font-medium">/ month</span>
              </div>

              <div className="mt-8 space-y-3.5 pt-6 border-t border-zinc-100 text-xs text-zinc-700">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>20 Active Product Listings</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Basic Storefront Customization</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Standard Multi-vendor Checkout</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Basic Visitor & Sales Analytics</span>
                </div>
                <div className="flex items-start gap-2.5 text-zinc-400">
                  <span className="w-4 h-4 shrink-0 text-center font-bold">✕</span>
                  <span>AI Copilot & SEO Generator</span>
                </div>
                <div className="flex items-start gap-2.5 text-zinc-400">
                  <span className="w-4 h-4 shrink-0 text-center font-bold">✕</span>
                  <span>AI Vision Image Analyzer</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('FREE')}
              disabled={actionLoading === 'FREE' || activeTier === 'FREE'}
              className="mt-8 w-full rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 disabled:opacity-50 py-2.5 text-xs font-semibold text-zinc-800 transition-colors"
            >
              {activeTier === 'FREE' ? 'Active Plan' : 'Downgrade to Free'}
            </button>
          </div>

          {/* PRO PLAN */}
          <div
            className={`rounded-2xl border-2 bg-gradient-to-b from-indigo-50/50 via-white to-white p-8 flex flex-col justify-between relative shadow-md transition-all ${
              activeTier === 'PRO'
                ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                : 'border-indigo-500'
            }`}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-3.5 right-6 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-1.5">
                    <span>Seller Pro</span>
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Full AI commerce suite, limitless inventory & theme builder.
                  </p>
                </div>
                {activeTier === 'PRO' && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Active Plan
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">
                  {billingCycle === 'annually' ? '$15' : '$19'}
                </span>
                <span className="text-xs text-zinc-500 font-medium">/ month</span>
                {billingCycle === 'annually' && (
                  <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Billed annually
                  </span>
                )}
              </div>

              <div className="mt-8 space-y-3.5 pt-6 border-t border-indigo-100 text-xs text-zinc-800 font-medium">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unlimited</strong> Product Catalog Listings
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI Seller Copilot:</strong> Instant SEO titles, markdown specs &
                    marketing copy
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI Vision Analyzer:</strong> Detect category, color, material & style
                    from photos
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI Shopping Assistant:</strong> Vector catalog discovery & RAG
                    recommendation
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Custom Storefront Themes & Section Builder</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Advanced MRR Revenue Analytics & Escrow Ledger</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Priority 24/7 Dedicated Support Concierge</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('PRO')}
              disabled={actionLoading === 'PRO' || activeTier === 'PRO'}
              className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              {actionLoading === 'PRO' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : activeTier === 'PRO' ? (
                <span>Current Active Subscription</span>
              ) : (
                <>
                  <span>Upgrade to Pro Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-zinc-900">Feature Matrix & Access Control</h3>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5">Platform Capability</th>
                  <th className="py-2.5">Free Plan</th>
                  <th className="py-2.5 text-indigo-600">Pro Plan ($19/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <td className="py-3 font-semibold text-zinc-900">Catalog Capacity</td>
                  <td className="py-3 text-zinc-600">Up to 20 SKUs</td>
                  <td className="py-3 font-bold text-indigo-600">Unlimited SKUs</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-zinc-900">AI Seller Copilot</td>
                  <td className="py-3 text-zinc-400">Locked (Guard Protected)</td>
                  <td className="py-3 text-emerald-600 font-semibold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-zinc-900">AI Vision Product Tagging</td>
                  <td className="py-3 text-zinc-400">Locked (Guard Protected)</td>
                  <td className="py-3 text-emerald-600 font-semibold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-zinc-900">Storefront Builder Studio</td>
                  <td className="py-3 text-zinc-600">Basic Colors</td>
                  <td className="py-3 text-indigo-600 font-semibold">
                    Hero, Grid & Custom Sections
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-zinc-900">
                    Stripe & SSLCommerz Integration
                  </td>
                  <td className="py-3 text-emerald-600 font-semibold">Included</td>
                  <td className="py-3 text-emerald-600 font-semibold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-zinc-900">Platform Commission Rate</td>
                  <td className="py-3 text-zinc-600">12.5%</td>
                  <td className="py-3 font-bold text-indigo-600">Reduced 8.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
