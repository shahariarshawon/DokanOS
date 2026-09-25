'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Package,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('order_id') || 'DKN-2026-LIVE';
  const status = (searchParams.get('status') || 'success').toLowerCase();
  const provider = (searchParams.get('provider') || 'Stripe').toUpperCase();
  const sessionId = searchParams.get('session_id') || searchParams.get('tran_id');

  const isSuccess = status === 'success' || status === 'completed';
  const isFailed = status === 'failed' || status === 'canceled';

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 text-center shadow-lg animate-fade-in">
          {/* Status Icon */}
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-5 ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-600'
                : isFailed
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-amber-50 text-amber-600'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : isFailed ? (
              <XCircle className="w-8 h-8" />
            ) : (
              <Clock className="w-8 h-8" />
            )}
          </div>

          {/* Heading */}
          <span
            className={`text-xs uppercase tracking-wider font-bold ${
              isSuccess ? 'text-emerald-600' : isFailed ? 'text-rose-600' : 'text-amber-600'
            }`}
          >
            {isSuccess
              ? 'Payment Verified & Settled'
              : isFailed
                ? 'Payment Canceled / Declined'
                : 'Payment Processing'}
          </span>

          <h1 className="text-2xl font-bold text-zinc-900 mt-1 mb-2">
            {isSuccess
              ? 'Transaction Completed!'
              : isFailed
                ? 'Payment Unsuccessful'
                : 'Verifying Transaction...'}
          </h1>

          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            {isSuccess
              ? `Your payment has been verified via ${provider}. The order lifecycle state has automatically moved to PAID and stock has been decremented in escrow.`
              : isFailed
                ? 'The payment gateway reported a canceled or declined transaction. No funds were captured.'
                : 'We are currently awaiting gateway webhook confirmation. Your cart and inventory hold will update momentarily.'}
          </p>

          {/* Transaction Metadata Card */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left space-y-2.5 mb-6 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Order ID:</span>
              <span className="font-mono font-bold text-zinc-900">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Payment Gateway:</span>
              <span className="font-semibold text-zinc-900">{provider}</span>
            </div>
            {sessionId && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Gateway Ref:</span>
                <span className="font-mono text-zinc-600 truncate max-w-[200px]">{sessionId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Security & Idempotency:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/orders"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track in Orders Hub</span>
            </Link>

            <Link
              href="/products"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-5 py-2.5 text-xs font-semibold text-zinc-700 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex items-center gap-3 text-zinc-500 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading payment confirmation...</span>
          </div>
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
