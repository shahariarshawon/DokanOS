'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Truck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();

  // Form state
  const [name, setName] = useState('Alex Mercer');
  const [email, setEmail] = useState('alex@example.com');
  const [address, setAddress] = useState('742 Evergreen Terrace');
  const [city, setCity] = useState('Springfield');
  const [state, setState] = useState('OR');
  const [zip, setZip] = useState('97477');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod'>('stripe');

  // Order state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const shipping = subtotal > 500 ? 0 : 25;
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + shipping + tax;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !email || !address || !city || !zip) {
      setErrorMessage('Please fill in all required shipping address fields.');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate backend checkout transaction & Stripe payment confirmation
      await new Promise((resolve) => setTimeout(resolve, 800));

      const generatedId = `DKN-${Math.floor(100000 + Math.random() * 900000)}`;
      setConfirmedOrderId(generatedId);
      clearCart();
    } catch {
      setErrorMessage('Order processing failed. Please check payment information.');
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (confirmedOrderId) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
        <header className="border-b border-zinc-800 bg-zinc-950/70 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              D
            </div>
            <span className="font-bold text-lg text-white">DokanOS Checkout</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div
            id="order-confirmation"
            data-testid="order-confirmation"
            className="w-full max-w-lg bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur relative overflow-hidden"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Payment & Order Verified
            </span>
            <h1 className="text-2xl font-bold text-white mt-1 mb-2">Order Placed Successfully!</h1>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Thank you for shopping with DokanOS. Your order has been registered in our
              high-throughput transactional database.
            </p>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Order ID:</span>
                <span
                  id="order-id-display"
                  data-testid="order-id-display"
                  className="font-mono font-bold text-white"
                >
                  {confirmedOrderId}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Deliver To:</span>
                <span className="text-zinc-300 font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Payment Gateway:</span>
                <span className="text-zinc-300 font-medium">
                  {paymentMethod === 'stripe' ? 'Stripe Checkout (Card)' : 'Cash On Delivery'}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-zinc-800">
                <span className="text-zinc-400 font-semibold">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                id="back-to-store-btn"
                data-testid="back-to-store-btn"
                href="/products"
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <span>Browse More Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs transition-all text-center"
              >
                View Analytics
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ACTIVE CHECKOUT FORM
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              D
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Secure Checkout</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">End-to-End Encrypted</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Shipping & Payment (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {errorMessage && (
              <div
                id="checkout-error"
                data-testid="checkout-error"
                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Shipping Address */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">1. Shipping Destination</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="shipping-name"
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Full Recipient Name
                  </label>
                  <input
                    id="shipping-name"
                    data-testid="shipping-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-email"
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Confirmation Email
                  </label>
                  <input
                    id="shipping-email"
                    data-testid="shipping-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="shipping-address"
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    Street Address
                  </label>
                  <input
                    id="shipping-address"
                    data-testid="shipping-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-city"
                    className="block text-xs font-medium text-zinc-400 mb-1.5"
                  >
                    City
                  </label>
                  <input
                    id="shipping-city"
                    data-testid="shipping-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="shipping-state"
                      className="block text-xs font-medium text-zinc-400 mb-1.5"
                    >
                      State / Prov
                    </label>
                    <input
                      id="shipping-state"
                      data-testid="shipping-state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="shipping-zip"
                      className="block text-xs font-medium text-zinc-400 mb-1.5"
                    >
                      Postal Code
                    </label>
                    <input
                      id="shipping-zip"
                      data-testid="shipping-zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Payment Method */}
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">2. Payment Method</h2>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="payment-stripe"
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'stripe'
                      ? 'bg-indigo-600/10 border-indigo-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="payment-stripe"
                      data-testid="payment-stripe"
                      name="payment-method"
                      checked={paymentMethod === 'stripe'}
                      onChange={() => setPaymentMethod('stripe')}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Credit Card (Stripe Checkout)
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Instant authorization, 3D Secure 2.0
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-300">
                    Visa / MC / Amex
                  </span>
                </label>

                <label
                  htmlFor="payment-cod"
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'bg-indigo-600/10 border-indigo-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="payment-cod"
                      data-testid="payment-cod"
                      name="payment-method"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">Cash on Delivery (COD)</p>
                      <p className="text-[11px] text-zinc-400">Pay when your items arrive</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-300">
                    Direct Payout
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Placement (1 col) */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-5">
              <h3 className="text-base font-semibold text-white">Order Review</h3>

              {/* Items recap */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-xs text-zinc-400">
                    <span className="truncate max-w-[180px]">
                      {quantity}x {product.title}
                    </span>
                    <span className="font-mono text-zinc-200">
                      $
                      {(product.price * quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-200">
                    ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Shipping</span>
                  <span className="font-mono text-zinc-200">
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Tax</span>
                  <span className="font-mono text-zinc-200">
                    ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-3 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
                  <span>Order Total</span>
                  <span
                    id="checkout-total"
                    data-testid="checkout-total"
                    className="font-mono text-indigo-400 text-base"
                  >
                    ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                id="place-order-btn"
                data-testid="place-order-btn"
                type="submit"
                disabled={isProcessing || items.length === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <span>Authorizing & Placing Order...</span>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Prisma Atomic Transactional Guarantee</span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
