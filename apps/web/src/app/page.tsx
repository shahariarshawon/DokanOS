import React from 'react';
import Link from 'next/link';
import { BarChart3, Bot, Store, Building2, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
            D
          </div>
          <span className="font-bold text-lg tracking-tight text-white">DokanOS</span>
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            Phase 9 • Quality Engineering
          </span>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3 text-xs">
          <Link
            id="nav-products"
            href="/products"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            Catalog
          </Link>
          <Link
            id="nav-login"
            href="/login"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            id="nav-dashboard"
            href="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/30"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Seller BI</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Autonomous Multi-Vendor Commerce</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Autonomous Multi-Vendor Operating System with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            AI & Analytics
          </span>
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
          Engineered for modern commerce scale. Powered by a high-throughput NestJS core,
          independent FastAPI pgvector AI service, and real-time business intelligence for sellers
          and platform operators.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold transition-all shadow-lg shadow-indigo-600/25"
          >
            <BarChart3 className="w-4 h-4" />
            Open Business Intelligence Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="http://localhost:4000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            Explore API Documentation
          </a>
        </div>

        {/* Highlight Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 text-left">
          {/* Card 1: Seller Analytics */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Seller BI Dashboard</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Real-time sales tracking, net merchant revenue, conversion rates, product
              leaderboards, and continuous shopper activity feeds.
            </p>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              View Seller Metrics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Admin Platform Intelligence */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Admin Intelligence</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Gross Marketplace Volume (GMV), platform take-rate commissions, multi-gateway
              transaction health, and user growth trajectories.
            </p>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              Explore Admin View <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: AI Intelligence Engine */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Autonomous AI Core</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              RAG shopping conversational assistant, pgvector product embedding pipeline, AI seller
              copywriting, and content-based recommendations.
            </p>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-purple-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              View AI Service API <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Architecture Badges */}
        <div className="pt-8 border-t border-zinc-900 w-full flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> PostgreSQL 16 + pgvector
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Redis Cache & Real-Time Presence
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-Tier TTL Aggregation
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> NestJS 12 + Next.js 16
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 px-6 text-center text-xs text-zinc-500">
        <p>DokanOS • Enterprise Multi-Vendor Marketplace Platform</p>
      </footer>
    </div>
  );
}
