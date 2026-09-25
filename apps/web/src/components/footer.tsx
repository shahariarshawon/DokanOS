import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, RefreshCw, Globe, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/80 bg-white text-zinc-600 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Info */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-xs">
                D
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                Dokan<span className="text-indigo-600">OS</span>
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm mb-4 leading-relaxed">
              Enterprise-grade multi-vendor commerce platform. Built with autonomous AI search,
              transactional variant inventories, and real-time vendor telemetry.
            </p>
            <div className="flex items-center gap-3 text-zinc-400">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Escrow Protected
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Real-time Sync
              </span>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-3 text-xs uppercase tracking-wider">
              Marketplace
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <Link href="/products" className="hover:text-zinc-900 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/products?categorySlug=smartphones-tech"
                  className="hover:text-zinc-900 transition-colors"
                >
                  Smartphones & Tech
                </Link>
              </li>
              <li>
                <Link
                  href="/products?categorySlug=audio-acoustics"
                  className="hover:text-zinc-900 transition-colors"
                >
                  Audio & Acoustics
                </Link>
              </li>
              <li>
                <Link
                  href="/products?categorySlug=computer-peripherals"
                  className="hover:text-zinc-900 transition-colors"
                >
                  Peripherals
                </Link>
              </li>
            </ul>
          </div>

          {/* Sellers */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-3 text-xs uppercase tracking-wider">
              Sellers
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <Link href="/dashboard" className="hover:text-zinc-900 transition-colors">
                  Seller Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=inventory"
                  className="hover:text-zinc-900 transition-colors"
                >
                  Inventory Manager
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=orders"
                  className="hover:text-zinc-900 transition-colors"
                >
                  Fulfillment Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-3 text-xs uppercase tracking-wider">
              Platform
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <Link href="/orders" className="hover:text-zinc-900 transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-zinc-900 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <span className="text-zinc-400">API Documentation</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>© {new Date().getFullYear()} DokanOS Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Next.js 16 + NestJS 12 Modular Monolith</span>
            <span>•</span>
            <span>PostgreSQL + pgvector</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
