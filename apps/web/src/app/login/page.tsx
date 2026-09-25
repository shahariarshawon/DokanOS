'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { DEMO_USERS } from '@/lib/mock-data';
import { useAuth, UserRole } from '@/lib/auth-context';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFillDemo = (role: 'buyer' | 'seller' | 'admin') => {
    const demo = DEMO_USERS[role];
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // Simulate network authentication latency
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (email === 'invalid@dokanos.dev' || password === 'wrongpass') {
        throw new Error('Invalid email or password. Please try again.');
      }

      // Successful auth resolution
      const matchedRole: UserRole = email.includes('seller')
        ? 'SELLER'
        : email.includes('admin')
          ? 'ADMIN'
          : 'CUSTOMER';

      const userName = email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const session = {
        email,
        role: matchedRole,
        accessToken: 'jwt_session_token_' + Date.now(),
        user: {
          id: 'user_' + Math.random().toString(36).substring(7),
          name: userName || 'Authenticated User',
          email,
          storeName: matchedRole === 'SELLER' ? 'Apple Authorized Store' : undefined,
          storeSlug: matchedRole === 'SELLER' ? 'apple-authorized' : undefined,
        },
      };

      // Update centralized reactive auth state
      login(session);

      setSuccess(`Signed in successfully as ${matchedRole}. Redirecting to your dashboard...`);

      // Determine redirect target based on explicit requirement
      const customRedirect = searchParams.get('redirect');
      const defaultRoleRoute =
        matchedRole === 'ADMIN'
          ? '/admin/dashboard'
          : matchedRole === 'SELLER'
            ? '/seller/dashboard'
            : '/account';

      const destination =
        customRedirect && customRedirect.startsWith('/') ? customRedirect : defaultRoleRoute;

      setTimeout(() => {
        router.push(destination);
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
            D
          </div>
          <span className="font-bold text-lg tracking-tight text-white">DokanOS</span>
        </div>

        <Link
          href="/products"
          className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to DokanOS</h1>
            <p className="text-xs text-zinc-400 mt-1.5">
              Secure multi-vendor marketplace access & autonomous platform controls
            </p>
          </div>

          {/* Quick Demo Pre-fill Pills */}
          <div className="mb-6 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[11px] font-medium text-zinc-400 block mb-2">
              Quick Demo Accounts:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="fill-buyer-btn"
                data-testid="fill-buyer-btn"
                onClick={() => handleFillDemo('buyer')}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 hover:border-indigo-500 text-[11px] font-medium text-zinc-300 hover:text-white transition-all text-center"
              >
                Buyer
              </button>
              <button
                type="button"
                id="fill-seller-btn"
                data-testid="fill-seller-btn"
                onClick={() => handleFillDemo('seller')}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 hover:border-emerald-500 text-[11px] font-medium text-zinc-300 hover:text-white transition-all text-center"
              >
                Seller
              </button>
              <button
                type="button"
                id="fill-admin-btn"
                data-testid="fill-admin-btn"
                onClick={() => handleFillDemo('admin')}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 hover:border-blue-500 text-[11px] font-medium text-zinc-300 hover:text-white transition-all text-center"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div
              id="login-error-alert"
              data-testid="login-error-alert"
              className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              id="login-success-alert"
              data-testid="login-success-alert"
              className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  data-testid="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seller@dokanos.dev"
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <button
              id="login-button"
              data-testid="login-button"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>Authenticating...</>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center text-xs text-zinc-500">
            Protected by DokanOS Secure Cloud Identity
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white text-xs">
          Loading sign in...
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
