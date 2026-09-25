'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Store,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { formatPrice, formatDate } from '@/lib/utils';

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  variantTitle?: string;
  productSku?: string;
  primaryImage?: string;
  unitPrice: number;
  quantity: number;
  storeName: string;
  fulfillmentStatus: string;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
  };
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dokanos_orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          setOrders(parsed);
          if (parsed.length > 0) {
            setSelectedOrder(parsed[0]);
          }
        } else {
          // Provide sample demo orders
          const demo: OrderRecord[] = [
            {
              id: 'DOK-2026-948122',
              orderNumber: 'DOK-2026-948122',
              placedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
              status: 'SHIPPED',
              subtotal: 1099.0,
              taxAmount: 54.95,
              shippingAmount: 0.0,
              totalAmount: 1153.95,
              shippingAddress: {
                name: 'Alex Mercer',
                street: '742 Evergreen Terrace',
                city: 'Springfield',
                state: 'OR',
              },
              items: [
                {
                  id: 'item-1',
                  productId: 'prod-001',
                  productTitle: 'iPhone 15 Pro Titanium',
                  variantTitle: 'Blue Titanium / 256GB',
                  productSku: 'IPH15P-BLU-256',
                  primaryImage:
                    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
                  unitPrice: 1099.0,
                  quantity: 1,
                  storeName: 'Apple Authorized Store',
                  fulfillmentStatus: 'SHIPPED',
                },
              ],
            },
            {
              id: 'DOK-2026-781903',
              orderNumber: 'DOK-2026-781903',
              placedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
              status: 'DELIVERED',
              subtotal: 399.0,
              taxAmount: 19.95,
              shippingAmount: 0.0,
              totalAmount: 418.95,
              shippingAddress: {
                name: 'Alex Mercer',
                street: '742 Evergreen Terrace',
                city: 'Springfield',
                state: 'OR',
              },
              items: [
                {
                  id: 'item-2',
                  productId: 'prod-003',
                  productTitle: 'Sony WH-1000XM5 Wireless ANC Headphones',
                  variantTitle: 'Midnight Black',
                  productSku: 'SONY-XM5-BLK',
                  primaryImage:
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
                  unitPrice: 399.0,
                  quantity: 1,
                  storeName: 'Acoustic Labs Pro',
                  fulfillmentStatus: 'DELIVERED',
                },
              ],
            },
          ];
          setOrders(demo);
          setSelectedOrder(demo[0]);
          localStorage.setItem('dokanos_orders', JSON.stringify(demo));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const timelineSteps = [
    { key: 'PENDING', label: 'Order Created', desc: 'Order placed in marketplace' },
    { key: 'PAID', label: 'Payment Verified', desc: 'Held safely in escrow' },
    { key: 'PROCESSING', label: 'Processing', desc: 'Seller picked and packed items' },
    { key: 'SHIPPED', label: 'Shipped', desc: 'Dispatched via Express Courier' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Package arrived at destination' },
  ];

  const getStepProgress = (status: OrderRecord['status']) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'PAID':
        return 2;
      case 'PROCESSING':
        return 3;
      case 'SHIPPED':
        return 4;
      case 'DELIVERED':
        return 5;
      case 'CANCELLED':
        return 0;
      default:
        return 1;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="pb-6 border-b border-zinc-200">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Order History & Fulfillment Tracking
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Track multi-vendor escrow orders and shipment milestones in real time.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="mt-8 min-h-[350px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
            <Package className="w-12 h-12 text-zinc-400 mb-3" />
            <h3 className="text-base font-semibold text-zinc-900">No orders placed yet</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm">
              When you purchase items across our marketplace stores, your order tracking timelines
              will appear here.
            </p>
            <Link
              href="/products"
              className="mt-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-semibold text-white shadow-xs"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Orders List (1 Col) */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Your Orders ({orders.length})
              </h2>
              {orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-zinc-900">{order.orderNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'SHIPPED'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatDate(order.placedAt)}</span>
                      <span className="font-semibold text-zinc-900">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-zinc-500 truncate">
                      {order.items.map((i) => i.productTitle).join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Order Detailed View & Interactive Timeline (2 Cols) */}
            {selectedOrder && (
              <div className="lg:col-span-2 space-y-6">
                {/* Visual Order Timeline Stepper (Part 5 Requirement) */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                        Live Escrow Timeline
                      </span>
                      <h3 className="text-base font-bold text-zinc-900">
                        Order #{selectedOrder.orderNumber}
                      </h3>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                      Placed: {formatDate(selectedOrder.placedAt)}
                    </span>
                  </div>

                  {/* Horizontal / Vertical Timeline Stepper */}
                  <div className="relative">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {timelineSteps.map((step, idx) => {
                        const stepNum = idx + 1;
                        const currentProgress = getStepProgress(selectedOrder.status);
                        const isCompleted = stepNum <= currentProgress;
                        const isCurrent = stepNum === currentProgress;

                        return (
                          <div key={step.key} className="flex flex-col items-start relative">
                            {/* Step Indicator */}
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                                }`}
                              >
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                              </div>
                              {isCurrent && (
                                <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                              )}
                            </div>

                            <span
                              className={`text-xs font-bold ${
                                isCompleted ? 'text-zinc-900' : 'text-zinc-400'
                              }`}
                            >
                              {step.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                              {step.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Purchased Items Card */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 pb-3 border-b border-zinc-100">
                    Line Items & Fulfillment Status
                  </h4>

                  <div className="divide-y divide-zinc-100">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {item.primaryImage && (
                            <img
                              src={item.primaryImage}
                              alt=""
                              className="h-12 w-12 rounded-lg object-cover border border-zinc-200"
                            />
                          )}
                          <div>
                            <span className="font-bold text-zinc-900 block">
                              {item.productTitle}
                            </span>
                            {item.variantTitle && (
                              <span className="text-[11px] text-zinc-500 font-medium">
                                Variant: {item.variantTitle}
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                              <Store className="w-3 h-3" />
                              <span>{item.storeName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <div className="text-right">
                            <span className="font-bold text-zinc-900">
                              {formatPrice(item.unitPrice * item.quantity)}
                            </span>
                            <div className="text-[10px] text-zinc-400">Qty: {item.quantity}</div>
                          </div>

                          {selectedOrder.status === 'DELIVERED' && (
                            <Link
                              href={`/products/${item.productId}`}
                              className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition-colors"
                            >
                              Leave Review
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals Breakdown */}
                  <div className="pt-4 border-t border-zinc-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-zinc-800">
                        {formatPrice(selectedOrder.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Shipping Fee</span>
                      <span className="font-medium text-zinc-800">
                        {selectedOrder.shippingAmount === 0
                          ? 'Free'
                          : formatPrice(selectedOrder.shippingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Taxes</span>
                      <span className="font-medium text-zinc-800">
                        {formatPrice(selectedOrder.taxAmount)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 flex justify-between font-bold text-sm text-zinc-900">
                      <span>Grand Total</span>
                      <span>{formatPrice(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
