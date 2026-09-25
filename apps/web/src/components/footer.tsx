'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, Globe, Mail, Phone, MapPin } from 'lucide-react';

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
              Enterprise-grade multi-vendor commerce platform empowering verified merchants and
              customers with seamless storefronts, order tracking, and secure global payments.
            </p>
            <div className="flex items-center gap-4 text-zinc-400">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Buyer Protection
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Instant Fulfillment
              </span>
            </div>
          </div>

          {/* Marketplace */}
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

          {/* Company */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-3 text-xs uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <Link href="/pricing" className="hover:text-zinc-900 transition-colors">
                  Plans & Pricing
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-zinc-900 transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link href="/seller/dashboard" className="hover:text-zinc-900 transition-colors">
                  Merchant Portal
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-zinc-900 transition-colors">
                  Shopping Basket
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-3 text-xs uppercase tracking-wider">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <Link href="/inbox" className="hover:text-zinc-900 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <span className="text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors">
                  Terms & Conditions
                </span>
              </li>
              <li>
                <span className="text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors">
                  Buyer Guarantee
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Clean Corporate Copyright Bar */}
        <div className="border-t border-zinc-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>© {new Date().getFullYear()} DokanOS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-zinc-600 transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span>•</span>
            <span className="hover:text-zinc-600 transition-colors cursor-pointer">
              Terms of Service
            </span>
            <span>•</span>
            <span className="hover:text-zinc-600 transition-colors cursor-pointer">
              Security Compliance
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
