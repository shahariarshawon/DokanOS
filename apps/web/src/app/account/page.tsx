'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Package,
  Heart,
  MapPin,
  Shield,
  CreditCard,
  LogOut,
  ChevronRight,
  ShoppingBag,
  ExternalLink,
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Plus,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { formatPrice, formatDate } from '@/lib/utils';
import { MOCK_PRODUCTS, Product } from '@/lib/mock-data';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, isLoading, logout, updateUser } = useAuth();
  const { addToCart } = useCart();

  const tabParam = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState<
    'profile' | 'orders' | 'wishlist' | 'addresses' | 'security'
  >(tabParam as any);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [address, setAddress] = useState('742 Evergreen Terrace, Springfield, OR 97477');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load orders from local storage or mock
  const [orders, setOrders] = useState<any[]>([]);

  // Wishlist items (sample from mock)
  const [wishlist, setWishlist] = useState<Product[]>(MOCK_PRODUCTS.slice(0, 3));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?redirect=/account');
    }
    if (user) {
      setName(user.name);
      try {
        const stored = localStorage.getItem('dokanos_orders');
        if (stored) {
          setOrders(JSON.parse(stored));
        } else {
          // Default sample order
          setOrders([
            {
              id: 'DOK-2026-90412',
              createdAt: new Date().toISOString(),
              status: 'CONFIRMED',
              totalAmount: 1199.0,
              items: [
                {
                  id: 'item-1',
                  productTitle: 'Apple iPhone 15 Pro Max',
                  quantity: 1,
                  unitPrice: 1199.0,
                  storeName: 'Apple Authorized Store',
                  primaryImage:
                    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
                },
              ],
            },
          ]);
        }
      } catch {
        // ignore
      }
    }
  }, [user, isLoading, router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateUser({ name: name.trim() });
      showToast('Profile updated successfully.');
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    showToast(`Added "${product.title}" to cart.`);
  };

  const handleRemoveWishlist = (id: string) => {
    setWishlist(wishlist.filter((w) => w.id !== id));
    showToast('Item removed from wishlist.');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      {/* Floating Toast */}
      {toastMessage && (
        <div
          id="account-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* User Greeting & Stats Banner */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-md shadow-indigo-600/20">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-900">{user.name}</h1>
                  <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    {role}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {role === 'SELLER' && (
                <Link
                  href="/seller/dashboard"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Seller Console</span>
                </Link>
              )}
              {role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 hover:bg-rose-50 hover:border-rose-200 text-zinc-700 hover:text-rose-600 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Account Tabs and Panels */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <aside className="md:col-span-1">
            <div className="rounded-2xl border border-zinc-200 bg-white p-2 space-y-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                  activeTab === 'profile'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                  activeTab === 'orders'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4" />
                  <span>My Orders</span>
                </div>
                <span className="text-[10px] bg-zinc-200/60 px-1.5 py-0.2 rounded-full text-zinc-700">
                  {orders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wishlist')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                  activeTab === 'wishlist'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4" />
                  <span>Saved Wishlist</span>
                </div>
                <span className="text-[10px] bg-zinc-200/60 px-1.5 py-0.2 rounded-full text-zinc-700">
                  {wishlist.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                  activeTab === 'addresses'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Shipping Addresses</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                  activeTab === 'security'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Account Security</span>
              </button>
            </div>
          </aside>

          {/* Active Tab Content Area */}
          <div className="md:col-span-3">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                  <h3 className="text-base font-bold text-zinc-900">Personal Information</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Update your account display name, verified contact information, and preferences.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg text-xs">
                  <div>
                    <label className="font-semibold text-zinc-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-700 block mb-1">
                      Email Address (Read Only)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-500 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-700 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-2xs"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Order History</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Review all past marketplace orders, vendor tracking numbers, and invoices.
                    </p>
                  </div>
                  <Link
                    href="/orders"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>Full Orders Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl text-xs text-zinc-400">
                    No orders placed yet. Explore products in the catalog.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order, idx) => (
                      <div
                        key={order.id || idx}
                        className="rounded-xl border border-zinc-200 p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 text-xs">
                          <div>
                            <span className="font-mono font-bold text-zinc-900">
                              Order #{order.id}
                            </span>
                            <span className="text-zinc-400 ml-2">
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              {order.status || 'CONFIRMED'}
                            </span>
                            <span className="font-bold text-zinc-900">
                              {formatPrice(order.totalAmount || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="space-y-2">
                          {order.items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={item.primaryImage}
                                  alt=""
                                  className="w-10 h-10 object-cover rounded-md border border-zinc-200"
                                />
                                <div>
                                  <span className="font-semibold text-zinc-900 line-clamp-1">
                                    {item.productTitle}
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    Sold by {item.storeName} • Qty: {item.quantity}
                                  </span>
                                </div>
                              </div>
                              <span className="font-semibold text-zinc-900">
                                {formatPrice(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                  <h3 className="text-base font-bold text-zinc-900">Saved Wishlist Items</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Items you bookmarked for later purchase across all verified marketplace stores.
                  </p>
                </div>

                {wishlist.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl text-xs text-zinc-400">
                    Your wishlist is currently empty.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {wishlist.map((prod) => (
                      <div
                        key={prod.id}
                        className="rounded-xl border border-zinc-200 p-3 flex flex-col justify-between space-y-3"
                      >
                        <div className="aspect-square w-full rounded-lg bg-zinc-100 overflow-hidden relative">
                          <img
                            src={prod.primaryImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono block">
                            {prod.storeName}
                          </span>
                          <h4 className="text-xs font-bold text-zinc-900 line-clamp-1">
                            {prod.title}
                          </h4>
                          <span className="text-sm font-bold text-indigo-600 block mt-1">
                            {formatPrice(prod.price)}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(prod)}
                            className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[11px] transition-colors"
                          >
                            Add to Cart
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveWishlist(prod.id)}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Remove from wishlist"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                  <h3 className="text-base font-bold text-zinc-900">Saved Shipping Addresses</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Default shipping destinations for express one-click checkout.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 space-y-2 max-w-lg text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Primary Home Address</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed font-medium">{address}</p>
                  <p className="text-zinc-400 font-mono text-[11px]">Phone: {phone}</p>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                  <h3 className="text-base font-bold text-zinc-900">Security & Credentials</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Manage session tokens, two-factor authorization, and account access.
                  </p>
                </div>

                <div className="space-y-4 max-w-lg text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                    <span className="font-bold text-zinc-900 block">Active JWT Session</span>
                    <span className="text-[11px] text-zinc-500 block">
                      Signed in via DokanOS Token Authorization
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={logout}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out of All Devices</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AccountPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-medium text-zinc-500">Loading your profile...</p>
          </div>
        </div>
      }
    >
      <AccountContent />
    </React.Suspense>
  );
}
