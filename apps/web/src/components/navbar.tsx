'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Store,
  LayoutDashboard,
  Search,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { AIShoppingAssistantWidget } from './ai-shopping-assistant';
import { NotificationBellDropdown } from './notification-bell';

export function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const navLinks = [
    { name: 'Storefront', href: '/products', icon: Layers },
    { name: 'Pricing & Plans', href: '/pricing', icon: Sparkles },
    { name: 'Messages', href: '/inbox', icon: MessageSquare },
    { name: 'My Orders', href: '/orders', icon: Package },
    { name: 'Seller Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-base shadow-sm group-hover:bg-indigo-600 transition-colors">
                D
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-tight text-zinc-900 group-hover:text-indigo-600 transition-colors">
                  Dokan<span className="text-indigo-600">OS</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  Commerce SaaS
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav
              aria-label="Main Platform Navigation"
              className="hidden md:flex items-center gap-1"
            >
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right CTA / Cart */}
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              aria-label="Search marketplace products"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              <span>Search marketplace...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-zinc-200 rounded text-zinc-400">
                ⌘K
              </kbd>
            </Link>

            {/* Notification Bell Dropdown */}
            <NotificationBellDropdown />

            <Link
              id="header-cart-btn"
              data-testid="header-cart-btn"
              href="/cart"
              aria-label={`Shopping Cart with ${itemCount} items`}
              className="relative flex items-center gap-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-all shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-zinc-600" aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              <span
                id="cart-badge-count"
                data-testid="cart-count-badge"
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white ${
                  itemCount > 0 ? 'bg-indigo-600' : 'bg-zinc-300 text-zinc-600'
                }`}
              >
                {itemCount}
              </span>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors shadow-xs"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* AI Floating Shopping Assistant */}
      <AIShoppingAssistantWidget />
    </>
  );
}
