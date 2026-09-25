'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ShieldAlert, ArrowLeft, Loader2, Store, User } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdminControlCenter } from '@/components/admin/admin-control-center';
import { useAuth } from '@/lib/auth-context';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login?redirect=/admin/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Strict Role Guard: Only ADMIN allowed
  if (role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider mb-2">
              403 Forbidden
            </span>
            <h2 className="text-xl font-bold text-zinc-900">Administrator Privileges Required</h2>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              This portal is restricted to authorized DokanOS platform administrators. Your account
              does not have permission to view or execute administrative commands.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {role === 'SELLER' ? (
                <Link
                  href="/seller/dashboard"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Return to Seller Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/account"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Go to My Profile</span>
                </Link>
              )}
              <Link
                href="/products"
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold text-xs transition-colors"
              >
                Explore Marketplace
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

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm font-bold text-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  DokanOS Admin Control Center
                </h1>
                <span className="rounded-full bg-purple-100 text-purple-700 font-bold px-2 py-0.5 text-[10px]">
                  SuperAdmin
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Multi-vendor platform governance, seller approvals, payouts, and system audit logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/seller/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-zinc-400" />
              <span>Seller Console</span>
            </Link>
            <Link
              href="/products"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
            >
              <span>View Storefront</span>
            </Link>
          </div>
        </div>

        {/* Full Admin Control Center */}
        <AdminControlCenter />
      </main>

      <Footer />
    </div>
  );
}
