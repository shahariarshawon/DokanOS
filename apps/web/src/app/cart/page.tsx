'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Store,
  Package,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, itemCount, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    if (couponCode.trim().toUpperCase() === 'DOKAN10') {
      setDiscountPct(10);
      setCouponSuccess('Coupon DOKAN10 applied! 10% discount.');
    } else {
      setCouponError('Invalid coupon code. Try "DOKAN10".');
    }
  };

  const discountAmount = (subtotal * discountPct) / 100;
  const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 25) : 0;
  const tax = (subtotal - discountAmount) * 0.08;
  const grandTotal = Math.max(0, subtotal - discountAmount + shipping + tax);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              D
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Your Shopping Cart</span>
          </div>
        </div>

        <Link
          href="/products"
          className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {items.length === 0 ? (
          <div
            id="empty-cart-message"
            data-testid="empty-cart-message"
            className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Your cart is currently empty</h2>
            <p className="text-xs text-zinc-400 max-w-sm mb-6">
              Looks like you haven&apos;t added any products to your basket yet. Explore our
              verified marketplace catalog.
            </p>
            <Link
              href="/products"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items List (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs text-zinc-400">
                <span>
                  Items in Cart (<strong className="text-white">{itemCount}</strong>)
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    data-testid="cart-item"
                    className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shrink-0 text-zinc-400">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500 mb-0.5">
                          <Store className="w-3 h-3" />
                          <span>{product.storeName}</span>
                        </span>
                        <h4
                          data-testid="cart-item-title"
                          className="text-sm font-semibold text-white line-clamp-1"
                        >
                          {product.title}
                        </h4>
                        <span
                          data-testid="cart-item-price"
                          className="text-xs font-mono font-semibold text-emerald-400 block mt-1"
                        >
                          ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Remove */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                        <button
                          type="button"
                          id={`qty-decrease-${product.id}`}
                          data-testid="qty-decrease"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span
                          data-testid="cart-item-qty"
                          className="w-8 text-center text-xs font-mono font-semibold text-white"
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          id={`qty-increase-${product.id}`}
                          data-testid="qty-increase"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-white min-w-[70px] text-right">
                          $
                          {(product.price * quantity).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <button
                          type="button"
                          id={`remove-item-${product.id}`}
                          data-testid="remove-item-btn"
                          onClick={() => removeFromCart(product.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary (1 col) */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-5">
                <h3 className="text-base font-semibold text-white">Order Summary</h3>

                {/* Subtotals breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span
                      id="cart-subtotal"
                      data-testid="cart-subtotal"
                      className="font-mono text-zinc-200"
                    >
                      ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {discountPct > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({discountPct}%)</span>
                      <span className="font-mono">
                        -${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-400">
                    <span>Shipping</span>
                    <span className="font-mono text-zinc-200">
                      {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>Estimated Tax (8%)</span>
                    <span className="font-mono text-zinc-200">
                      ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
                    <span>Grand Total</span>
                    <span
                      id="cart-total"
                      data-testid="cart-total"
                      className="font-mono text-indigo-400 text-base"
                    >
                      ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Promo Code Input */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      id="coupon-input"
                      data-testid="coupon-input"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Promo Code (e.g. DOKAN10)"
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      id="apply-coupon-btn"
                      data-testid="apply-coupon-btn"
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
                  {couponSuccess && <p className="text-[11px] text-emerald-400">{couponSuccess}</p>}
                </form>

                {/* Checkout CTA */}
                <button
                  id="proceed-checkout-btn"
                  data-testid="proceed-checkout-btn"
                  type="button"
                  onClick={() => router.push('/checkout')}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-Bit SSL Encrypted Checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
