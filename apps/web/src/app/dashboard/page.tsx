'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function DashboardRouter() {
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login?redirect=/seller/dashboard');
      return;
    }

    if (role === 'ADMIN') {
      router.replace('/admin/dashboard');
    } else if (role === 'SELLER') {
      router.replace('/seller/dashboard');
    } else {
      router.replace('/account');
    }
  }, [role, isAuthenticated, user, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
      <div className="flex flex-col items-center space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold shadow-md">
          D
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Navigating to your workspace...</span>
        </div>
      </div>
    </div>
  );
}
