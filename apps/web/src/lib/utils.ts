import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string | null | undefined): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numeric);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function getCategoryName(category: unknown): string {
  if (!category) return 'General';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && category !== null) {
    const cat = category as Record<string, unknown>;
    return String(cat.name || cat.slug || cat.title || 'General');
  }
  return String(category);
}

export function getStoreName(store: unknown): string {
  if (!store) return 'Verified Vendor';
  if (typeof store === 'string') return store;
  if (typeof store === 'object' && store !== null) {
    const s = store as Record<string, unknown>;
    return String(s.name || s.slug || s.title || 'Verified Vendor');
  }
  return String(store);
}
