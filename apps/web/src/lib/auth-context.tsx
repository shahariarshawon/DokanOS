'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  storeName?: string;
  storeSlug?: string;
}

export interface AuthSession {
  email: string;
  role: UserRole;
  accessToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    storeName?: string;
    storeSlug?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'dokanos_session';
const AUTH_EVENT_KEY = 'dokanos_auth_change';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessionFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthSession;
        if (parsed && parsed.email && parsed.role) {
          setSession(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Ignore parse failure
    }
    setSession(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSessionFromStorage();

    const handleAuthEvent = () => {
      loadSessionFromStorage();
    };

    window.addEventListener(AUTH_EVENT_KEY, handleAuthEvent);
    window.addEventListener('storage', handleAuthEvent);

    return () => {
      window.removeEventListener(AUTH_EVENT_KEY, handleAuthEvent);
      window.removeEventListener('storage', handleAuthEvent);
    };
  }, [loadSessionFromStorage]);

  const login = useCallback((newSession: AuthSession) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
      window.dispatchEvent(new Event(AUTH_EVENT_KEY));
    }
    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_EVENT_KEY));
    }
    setSession(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback(
    (updates: Partial<AuthUser>) => {
      if (!session) return;
      const updated: AuthSession = {
        ...session,
        user: {
          ...session.user,
          ...updates,
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event(AUTH_EVENT_KEY));
      }
      setSession(updated);
    },
    [session],
  );

  const authUser: AuthUser | null = session
    ? {
        id: session.user?.id || 'user_default',
        name: session.user?.name || session.email.split('@')[0],
        email: session.email,
        role: session.role,
        avatar: session.user?.avatar,
        storeName: session.user?.storeName,
        storeSlug: session.user?.storeSlug,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        role: session?.role ?? null,
        accessToken: session?.accessToken ?? null,
        isAuthenticated: Boolean(session),
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
