'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Package,
  CreditCard,
  MessageSquare,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationItem,
} from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export function NotificationBellDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await fetchUserNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const filteredNotifications =
    activeFilter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
      case 'ORDER_STATUS':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'PAYMENT':
      case 'PAYMENT_SUCCESS':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'CHAT':
      case 'CHAT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'SUBSCRIPTION':
      case 'SUBSCRIPTION_ACTIVATED':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-zinc-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        data-testid="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 shadow-2xs transition-colors"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            id="notification-badge-count"
            data-testid="notification-badge-count"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown-panel"
          data-testid="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200 bg-white shadow-2xl z-50 overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-100 bg-white text-[11px]">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                activeFilter === 'UNREAD'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 space-y-1">
                <Bell className="w-6 h-6 mx-auto text-zinc-300 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-zinc-700">No notifications to display</p>
                <p className="text-[11px] text-zinc-400">You are all caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 hover:bg-zinc-50/80 transition-colors flex items-start gap-3 text-xs ${
                    !notif.isRead ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-zinc-900 truncate">{notif.title}</span>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      {notif.type === 'CHAT' ? (
                        <Link
                          href="/inbox"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <span>Open Chat</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : notif.type === 'ORDER' ? (
                        <Link
                          href="/orders"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <span>View Order</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-zinc-400">
                          {notif.type}
                        </span>
                      )}

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-0.5"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-zinc-100 bg-zinc-50 text-center">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900"
            >
              Real-time WebSocket & Email Event Stream Active
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
