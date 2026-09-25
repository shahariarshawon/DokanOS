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
  Tag,
  Check,
  Package,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useCart } from '@/lib/cart-context';
import { formatPrice, getStoreName } from '@/lib/utils';

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
  const shipping = subtotal > 0 ? (subtotal >= 500 ? 0 : 25) : 0;
  const tax = (subtotal - discountAmount) * 0.05; // 5% tax
  const grandTotal = Math.max(0, subtotal - discountAmount + shipping + tax);

  // Group items by vendor store for multi-vendor checkout experience (Part 6)
  const itemsByStore = items.reduce(
    (acc, item) => {
      const storeId = item.product.storeId || (item.product as any).store?.id || 'default-store';
      const storeName = getStoreName(item.product.storeName || (item.product as any).store);
      if (!acc[storeId]) {
        acc[storeId] = {
          storeName,
          storeSlug:
            item.product.storeSlug ||
            (typeof (item.product as any).store === 'object'
              ? (item.product as any).store?.slug
              : 'store'),
          items: [],
        };
      }
      acc[storeId].items.push(item);
      return acc;
    },
    {} as Record<string, { storeName: string; storeSlug: string; items: typeof items }>,
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Shopping Cart</h1>
            <p className="text-xs text-zinc-500 mt-1">
              You have {itemCount} {itemCount === 1 ? 'item' : 'items'} in your multi-vendor basket.
            </p>
          </div>

          <Link
            href="/products"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div
            id="empty-cart-message"
            data-testid="empty-cart-message"
            className="mt-8 min-h-[400px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">Your cart is currently empty</h2>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-6">
              Looks like you haven&apos;t added any products to your basket yet. Explore our
              verified marketplace catalog.
            </p>
            <Link
              href="/products"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-semibold text-white transition-colors shadow-xs"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Items List Grouped by Store (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(itemsByStore).map(([storeId, storeGroup]) => (
                <div
                  key={storeId}
                  className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs"
                >
                  {/* Store Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50/70 border-b border-zinc-200 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-zinc-800">
                      <Store className="w-4 h-4 text-zinc-400" />
                      <span>{storeGroup.storeName}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {storeGroup.items.length} {storeGroup.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Items from this store */}
                  <div className="divide-y divide-zinc-100">
                    {storeGroup.items.map((item) => (
                      <div
                        key={item.id}
                        data-testid="cart-item"
                        className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        {/* Image & Title */}
                        <div className="flex items-center gap-4">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                            <img
                              src={item.product.primaryImage}
                              alt={item.product.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/products/${item.product.id}`}
                              className="text-sm font-semibold text-zinc-900 hover:text-indigo-600 transition-colors line-clamp-1"
                            >
                              {item.product.title}
                            </Link>

                            {/* Variant Tag (Part 6 Requirement) */}
                            {item.variant ? (
                              <div className="mt-1 inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                                <span>Variant: {item.variant.title}</span>
                              </div>
                            ) : (
                              <div className="mt-1 text-[11px] text-zinc-500">
                                SKU: {item.product.sku}
                              </div>
                            )}

                            <div className="mt-2 text-xs font-bold text-zinc-900 sm:hidden">
                              {formatPrice(item.unitPrice * item.quantity)}
                            </div>
                          </div>
                        </div>

                        {/* Controls & Price */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                          {/* Quantity control */}
                          <div className="flex items-center rounded-lg border border-zinc-200 bg-white">
                            <button
                              data-testid="qty-decrease"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span
                              data-testid="cart-item-qty"
                              className="px-2.5 text-xs font-bold text-zinc-900"
                            >
                              {item.quantity}
                            </span>
                            <button
                              data-testid="qty-increase"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="hidden sm:block text-right min-w-[80px]">
                            <div className="text-sm font-bold text-zinc-900">
                              {formatPrice(item.unitPrice * item.quantity)}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {formatPrice(item.unitPrice)} each
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            data-testid="remove-item-btn"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Clear Shopping Basket
                </button>
              </div>
            </div>

            {/* Order Summary & Checkout Card (1 Col) */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
              <h3 className="text-base font-bold text-zinc-900 pb-3 border-b border-zinc-100">
                Order Summary
              </h3>

              {/* Coupon Code Input */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Promotional Coupon
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="coupon-input"
                      data-testid="coupon-input"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Try 'DOKAN10'"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs text-zinc-900 uppercase placeholder-zinc-400 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <button
                    data-testid="apply-coupon-btn"
                    type="submit"
                    className="rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponSuccess && (
                  <p className="text-[11px] text-emerald-600 font-medium">{couponSuccess}</p>
                )}
                {couponError && (
                  <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                )}
              </form>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs pt-3 border-t border-zinc-100">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span data-testid="cart-subtotal" className="font-semibold text-zinc-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({discountPct}%)</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-zinc-600">
                  <span className="flex items-center gap-1">
                    Estimated Shipping
                    {subtotal >= 500 && (
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1 rounded">
                        FREE OVER $500
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>

                <div className="flex justify-between text-zinc-600">
                  <span>Estimated Tax (5%)</span>
                  <span className="font-semibold text-zinc-900">{formatPrice(tax)}</span>
                </div>

                <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-zinc-900">Total</span>
                  <span data-testid="cart-total" className="text-xl font-extrabold text-zinc-900">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link
                data-testid="proceed-checkout-btn"
                href="/checkout"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition-colors shadow-xs"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Security note */}
              <div className="pt-2 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit Encrypted Multi-Vendor Checkout</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
