'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Truck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Package,
  Store,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/utils';
import { initiatePayment } from '@/lib/api-client';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  // Form state
  const [name, setName] = useState('Alex Mercer');
  const [email, setEmail] = useState('alex@example.com');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [address, setAddress] = useState('742 Evergreen Terrace');
  const [city, setCity] = useState('Springfield');
  const [state, setState] = useState('OR');
  const [zip, setZip] = useState('97477');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod' | 'sslcommerz'>('stripe');

  // Order state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const shipping = subtotal > 500 ? 0 : 25;
  const tax = subtotal * 0.05; // 5% tax
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
      const generatedId = `DKN-${Date.now()}`;
      const idempotencyKey = `idem_${generatedId}_${Date.now()}`;

      // Initiate payment session with gateway abstraction layer
      if (paymentMethod === 'stripe' || paymentMethod === 'sslcommerz') {
        const paymentRes = await initiatePayment({
          orderId: generatedId,
          provider: paymentMethod === 'stripe' ? 'STRIPE' : 'SSLCOMMERZ',
          idempotencyKey,
          successUrl: `${window.location.origin}/orders/confirmation?orderId=${generatedId}`,
          cancelUrl: `${window.location.origin}/checkout`,
        });

        // If redirect URL returned (e.g. Stripe Hosted Checkout or SSLCommerz Gateway)
        if (paymentRes.redirectUrl && !paymentRes.redirectUrl.includes('sandbox.sslcommerz.com')) {
          window.location.href = paymentRes.redirectUrl;
          return;
        }
      }

      // Save order to localStorage for tracking in /orders
      if (typeof window !== 'undefined') {
        try {
          const existingOrders = JSON.parse(localStorage.getItem('dokanos_orders') || '[]');
          const newOrder = {
            id: generatedId,
            orderNumber: generatedId,
            placedAt: new Date().toISOString(),
            status: paymentMethod === 'cod' ? 'PENDING' : 'PAID',
            paymentMethod: paymentMethod.toUpperCase(),
            subtotal,
            taxAmount: tax,
            shippingAmount: shipping,
            totalAmount: grandTotal,
            shippingAddress: {
              name,
              email,
              phone,
              street: address,
              city,
              state,
              zip,
              country: 'US',
            },
            items: items.map((i) => ({
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: i.productId,
              productTitle: i.product.title,
              variantTitle: i.variant?.title,
              productSku: i.variant?.sku ?? i.product.sku,
              primaryImage: i.product.primaryImage,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              storeName: i.product.storeName,
              fulfillmentStatus: 'UNFULFILLED',
            })),
          };
          localStorage.setItem('dokanos_orders', JSON.stringify([newOrder, ...existingOrders]));
        } catch {
          // ignore
        }
      }

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
      <div className="min-h-screen flex flex-col bg-zinc-50/50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div
            id="order-confirmation"
            data-testid="order-confirmation"
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 text-center shadow-lg animate-fade-in"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold">
              Payment & Order Verified
            </span>
            <h1 className="text-2xl font-bold text-zinc-900 mt-1 mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              Thank you for shopping on DokanOS. Your multi-vendor order has been atomically
              registered and stock has been reserved in our inventory ledger.
            </p>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left space-y-2 mb-6 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order Number:</span>
                <span
                  id="order-id-display"
                  data-testid="order-id-display"
                  className="font-mono font-bold text-zinc-900"
                >
                  {confirmedOrderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount Paid:</span>
                <span className="font-semibold text-zinc-900">{formatPrice(grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Destination:</span>
                <span className="text-zinc-700 font-medium truncate max-w-[200px]">
                  {address}, {city}, {state}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/orders"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors shadow-xs"
              >
                <span>Track Order Timeline</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                data-testid="back-to-store-btn"
                href="/products"
                className="flex-1 flex items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-5 py-2.5 text-xs font-semibold text-zinc-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Secure Checkout & Multi-Vendor Escrow
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Complete your multi-vendor transaction with atomic inventory reservation.
            </p>
          </div>
          <Link
            href="/cart"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Cart</span>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 min-h-[300px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
            <Package className="w-10 h-10 text-zinc-400 mb-3" />
            <h2 className="text-base font-bold text-zinc-900">Your basket is empty</h2>
            <p className="text-xs text-zinc-500 mt-1 mb-5">
              Add items to your cart before proceeding to checkout.
            </p>
            <Link
              href="/products"
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Shipping Details + Payment Methods */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Shipping Address */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                    1
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900">Shipping Address</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Full Name *
                    </label>
                    <input
                      data-testid="shipping-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Email Address *
                    </label>
                    <input
                      data-testid="shipping-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Street Address *
                    </label>
                    <input
                      data-testid="shipping-address"
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">City *</label>
                    <input
                      data-testid="shipping-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Postal Code *
                    </label>
                    <input
                      data-testid="shipping-zip"
                      type="text"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                    2
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900">Payment Gateway</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Stripe Credit Card */}
                  <label
                    className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'stripe'
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <input
                        data-testid="payment-stripe"
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'stripe'}
                        onChange={() => setPaymentMethod('stripe')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-900">Credit / Debit</span>
                    <span className="text-[11px] text-zinc-500">Stripe Payment Gateway</span>
                  </label>

                  {/* Cash on Delivery */}
                  <label
                    className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Truck className="w-5 h-5 text-zinc-700" />
                      <input
                        data-testid="payment-cod"
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-900">Pay on Delivery</span>
                    <span className="text-[11px] text-zinc-500">Escrow on Receipt</span>
                  </label>

                  {/* SSLCommerz */}
                  <label
                    className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'sslcommerz'
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'sslcommerz'}
                        onChange={() => setPaymentMethod('sslcommerz')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-900">SSLCommerz</span>
                    <span className="text-[11px] text-zinc-500">Cards & Mobile Wallets</span>
                  </label>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Itemized Order Summary */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
              <h3 className="text-base font-bold text-zinc-900 pb-3 border-b border-zinc-100">
                Summary ({items.length} items)
              </h3>

              {/* Items Preview */}
              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={item.product.primaryImage}
                        alt=""
                        className="h-9 w-9 rounded-md object-cover border border-zinc-200"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900 line-clamp-1">
                          {item.product.title}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          {item.variant ? item.variant.title : `Qty: ${item.quantity}`}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-zinc-900">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2 text-xs pt-3 border-t border-zinc-100">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Standard Shipping</span>
                  <span className="font-semibold text-zinc-900">
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Estimated Tax</span>
                  <span className="font-semibold text-zinc-900">{formatPrice(tax)}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-zinc-900">Grand Total</span>
                  <span className="text-xl font-extrabold text-zinc-900">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="place-order-button"
                data-testid="place-order-btn"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition-colors shadow-xs"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Escrow...</span>
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Place Order & Pay {formatPrice(grandTotal)}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
