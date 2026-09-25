'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Store,
  LayoutDashboard,
  Search,
  Package,
  Layers,
  Sparkles,
  MessageSquare,
  User,
  LogOut,
  Shield,
  Heart,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth, UserRole } from '@/lib/auth-context';
import { AIShoppingAssistantWidget } from './ai-shopping-assistant';
import { NotificationBellDropdown } from './notification-bell';

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, isLoaded } = useCart();
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayCount = isLoaded ? itemCount : 0;

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Dynamic Navigation Links based on user role
  const getNavLinks = () => {
    if (role === 'ADMIN') {
      return [
        { name: 'Storefront', href: '/products', icon: Layers },
        { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Shield },
        { name: 'Seller Console', href: '/seller/dashboard', icon: LayoutDashboard },
        { name: 'Messages', href: '/inbox', icon: MessageSquare },
      ];
    }
    if (role === 'SELLER') {
      return [
        { name: 'Storefront', href: '/products', icon: Layers },
        { name: 'Seller Dashboard', href: '/seller/dashboard', icon: LayoutDashboard },
        { name: 'Orders Hub', href: '/orders', icon: Package },
        { name: 'Messages', href: '/inbox', icon: MessageSquare },
      ];
    }
    return [
      { name: 'Storefront', href: '/products', icon: Layers },
      { name: 'Pricing & Plans', href: '/pricing', icon: Sparkles },
      { name: 'Messages', href: '/inbox', icon: MessageSquare },
      { name: 'My Orders', href: '/orders', icon: Package },
      { name: 'Become a Seller', href: '/seller/dashboard', icon: Store },
    ];
  };

  const navLinks = getNavLinks();

  const getRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
            Admin
          </span>
        );
      case 'SELLER':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            Merchant
          </span>
        );
      case 'CUSTOMER':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            Customer
          </span>
        );
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md transition-all">
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

          {/* Right Controls */}
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

            {/* Shopping Cart Button */}
            <Link
              id="header-cart-btn"
              data-testid="header-cart-btn"
              href="/cart"
              aria-label={`Shopping Cart with ${displayCount} items`}
              suppressHydrationWarning
              className="relative flex items-center gap-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-all shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-zinc-600" aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              <span
                id="cart-badge-count"
                data-testid="cart-count-badge"
                suppressHydrationWarning
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white ${
                  displayCount > 0 ? 'bg-indigo-600' : 'bg-zinc-300 text-zinc-600'
                }`}
              >
                {displayCount}
              </span>
            </Link>

            {/* Auth State Button / Profile Dropdown */}
            {isLoading ? (
              <div className="h-8 w-8 rounded-lg bg-zinc-100 animate-pulse border border-zinc-200" />
            ) : isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="user-profile-menu-button"
                  data-testid="user-profile-menu-button"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-800 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-[11px]">
                    {getUserInitials()}
                  </div>
                  <span className="hidden md:inline font-semibold text-zinc-900 max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div
                    id="user-profile-dropdown"
                    data-testid="user-profile-dropdown"
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-fade-in z-50 text-xs"
                  >
                    {/* Header info */}
                    <div className="px-3 py-2.5 border-b border-zinc-100 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 truncate block text-sm">
                          {user.name}
                        </span>
                        {role && getRoleBadge(role)}
                      </div>
                      <span className="text-[11px] text-zinc-500 truncate block mt-0.5 font-mono">
                        {user.email}
                      </span>
                    </div>

                    {/* Role-Specific Menu Options */}
                    <div className="space-y-0.5">
                      {role === 'CUSTOMER' && (
                        <>
                          <Link
                            href="/account"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <Package className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Order History</span>
                          </Link>
                          <Link
                            href="/account?tab=wishlist"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <Heart className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Saved Wishlist</span>
                          </Link>
                        </>
                      )}

                      {role === 'SELLER' && (
                        <>
                          <Link
                            href="/seller/dashboard"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Seller Dashboard</span>
                          </Link>
                          <Link
                            href="/seller/dashboard?tab=store_builder"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <Store className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Store Management</span>
                          </Link>
                          <Link
                            href="/seller/dashboard?tab=profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Profile & Settings</span>
                          </Link>
                        </>
                      )}

                      {role === 'ADMIN' && (
                        <>
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors font-medium text-purple-700 bg-purple-50/50"
                          >
                            <Shield className="w-3.5 h-3.5 text-purple-600" />
                            <span>Admin Dashboard</span>
                          </Link>
                          <Link
                            href="/account"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Profile</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Logout Button */}
                    <div className="mt-1 pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        id="navbar-logout-btn"
                        data-testid="navbar-logout-btn"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-medium text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                id="navbar-signin-btn"
                data-testid="navbar-signin-btn"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors shadow-xs"
              >
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* AI Floating Shopping Assistant */}
      <AIShoppingAssistantWidget />
    </>
  );
}
