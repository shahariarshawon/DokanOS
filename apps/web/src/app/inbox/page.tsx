'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Circle,
  FileText,
  Image as ImageIcon,
  Store,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  X,
  Loader2,
  Package,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  fetchConversations,
  fetchChatMessages,
  sendChatMessage,
  markConversationAsRead,
  uploadChatAttachment,
  ConversationItem,
  ChatMessage,
} from '@/lib/api-client';
import { formatDate, formatPrice } from '@/lib/utils';

export default function CustomerSellerInboxPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'HUMAN' | 'AI'>('ALL');
  const [attachments, setAttachments] = useState<
    Array<{ url: string; fileName: string; fileType: string; size: number }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    async function init() {
      const convs = await fetchConversations();
      setConversations(convs);
      if (convs.length > 0) {
        setActiveConversationId(convs[0].id);
      }
    }
    init();
  }, []);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    async function loadThread() {
      if (!activeConversationId) return;
      const msgs = await fetchChatMessages(activeConversationId);
      setMessages(msgs);
      await markConversationAsRead(activeConversationId);
      // Mark local conversation unread count as 0
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)),
      );
    }
    loadThread();

    // Auto-scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || !activeConversationId || isSending)
      return;

    const content =
      inputText.trim() ||
      (attachments.length > 0 ? `Sent ${attachments.length} attachment(s)` : '');
    const currentAttachments = [...attachments];

    setIsSending(true);
    setInputText('');
    setAttachments([]);

    try {
      const newMsg = await sendChatMessage(activeConversationId, {
        content,
        type: currentAttachments.length > 0 ? 'FILE' : 'TEXT',
        attachments: currentAttachments,
      });

      setMessages((prev) => [...prev, newMsg]);

      // Update conversations list with latest message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, latestMessage: newMsg, lastMessageAt: new Date().toISOString() }
            : c,
        ),
      );

      // Simulate seller typing indicator and auto-reply for realistic demo
      if (activeConversation?.store?.name) {
        setTimeout(() => {
          setIsTyping(true);
        }, 1200);

        setTimeout(() => {
          setIsTyping(false);
          const replyMsg: ChatMessage = {
            id: `reply_${Date.now()}`,
            conversationId: activeConversationId,
            senderId: activeConversation.store.sellerProfile?.userId || 'seller-partner',
            content: `Thank you for reaching out to ${activeConversation.store.name}! Our representative has received your request and will provide full details immediately.`,
            type: 'TEXT',
            status: 'DELIVERED',
            isRead: false,
            createdAt: new Date().toISOString(),
            sender: {
              id: 'seller-partner',
              firstName: activeConversation.store.name,
              lastName: 'Concierge',
              avatarUrl: activeConversation.store.logoUrl,
            },
          };
          setMessages((prev) => [...prev, replyMsg]);
        }, 3200);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadChatAttachment(file);
      setAttachments((prev) => [
        ...prev,
        {
          url: res.url,
          fileName: res.filename || file.name,
          fileType: file.type,
          size: file.size,
        },
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.latestMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'HUMAN') return matchesSearch && c.type !== 'AI_CHAT';
    if (filterType === 'AI') return matchesSearch && c.type === 'AI_CHAT';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col md:flex-row h-[calc(100vh-170px)] min-h-[600px]">
          {/* LEFT COLUMN: CONVERSATION LIST (Airbnb / Slack Inbox style) */}
          <div className="w-full md:w-80 lg:w-96 border-r border-zinc-200 flex flex-col shrink-0 bg-white">
            {/* Inbox Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Messages & Inquiries</h2>
                <p className="text-[11px] text-zinc-500">Real-time merchant & buyer messaging</p>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Socket.io Live
              </span>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats or vendors..."
                  className="w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-indigo-600 shadow-2xs"
                />
              </div>

              {/* Chat Type Filters */}
              <div className="flex items-center gap-1.5 mt-2.5">
                {(['ALL', 'HUMAN', 'AI'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      filterType === t
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {t === 'ALL' ? 'All Threads' : t === 'HUMAN' ? 'Seller Chats' : 'AI Bot'}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Threads List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  <MessageSquare className="w-8 h-8 mx-auto text-zinc-300 mb-2 stroke-[1.5]" />
                  <p className="font-semibold text-zinc-700">No conversations found</p>
                  <p className="text-[11px] text-zinc-400">
                    Visit a vendor storefront to initiate a message.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                        isActive
                          ? 'bg-indigo-50/50 border-l-4 border-indigo-600'
                          : 'hover:bg-zinc-50'
                      }`}
                    >
                      {/* Avatar with live online dot */}
                      <div className="relative shrink-0">
                        <img
                          src={
                            conv.store.logoUrl ||
                            'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80'
                          }
                          alt={conv.store.name}
                          className="h-10 w-10 rounded-xl object-cover border border-zinc-200"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-zinc-900 truncate">
                            {conv.store.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            {formatDate(conv.lastMessageAt)}
                          </span>
                        </div>

                        {/* Order pill if linked */}
                        {conv.order && (
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.2 text-[9px] font-semibold text-zinc-600 my-0.5">
                            <Package className="w-2.5 h-2.5 text-zinc-500" />
                            <span>#{conv.order.orderNumber}</span>
                          </span>
                        )}

                        <p
                          className={`text-[11px] truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-bold text-zinc-900' : 'text-zinc-500'}`}
                        >
                          {conv.latestMessage?.content || 'No messages yet.'}
                        </p>
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shrink-0 mt-1">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CHAT WINDOW (Slack / Linear messaging experience) */}
          {activeConversation ? (
            <div className="flex-1 flex flex-col bg-zinc-50/30 overflow-hidden">
              {/* Top Chat Header */}
              <div className="p-4 border-b border-zinc-200 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        activeConversation.store.logoUrl ||
                        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80'
                      }
                      alt={activeConversation.store.name}
                      className="h-10 w-10 rounded-xl object-cover border border-zinc-200"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-zinc-900 truncate">
                        {activeConversation.store.name}
                      </h3>
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                        Verified Merchant
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                        Online Now
                      </span>
                      <span>•</span>
                      <span>Typically replies within 5 mins</span>
                    </div>
                  </div>
                </div>

                {/* Linked Order & Storefront Links */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/store/${activeConversation.store.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
                  >
                    <Store className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Storefront</span>
                  </Link>

                  {activeConversation.order && (
                    <Link
                      href="/orders"
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order #{activeConversation.order.orderNumber}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Security and Trust Banner */}
                <div className="mx-auto max-w-md rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-xs p-3 text-center text-[11px] text-zinc-500 shadow-2xs">
                  <span className="font-bold text-zinc-700">
                    Protected by DokanOS Escrow & Messenger
                  </span>
                  <p className="text-[10px] mt-0.5">
                    Never share your banking passwords or send direct offline wire transfers.
                  </p>
                </div>

                {messages.map((msg) => {
                  const isMine = msg.senderId === 'user-customer-1';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <img
                          src={
                            msg.sender?.avatarUrl ||
                            activeConversation.store.logoUrl ||
                            'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="h-7 w-7 rounded-lg object-cover border border-zinc-200 shrink-0 mb-1"
                        />
                      )}

                      <div
                        className={`max-w-md sm:max-w-lg space-y-1 ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {/* Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                            isMine
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-white text-zinc-800 border border-zinc-200 rounded-bl-xs'
                          }`}
                        >
                          <p>{msg.content}</p>

                          {/* Render file attachments if present */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-white/20">
                              {msg.attachments.map((att, idx) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg text-[11px] transition-colors ${
                                    isMine
                                      ? 'bg-white/10 hover:bg-white/20 text-white'
                                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                                  }`}
                                >
                                  {att.fileType?.startsWith('image/') ? (
                                    <ImageIcon className="w-4 h-4 shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 shrink-0" />
                                  )}
                                  <span className="truncate flex-1 font-mono">
                                    {att.fileName || 'Attachment'}
                                  </span>
                                  <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Metadata: Timestamp & Read Status */}
                        <div
                          className={`flex items-center gap-1.5 text-[10px] text-zinc-400 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <span>{formatDate(msg.createdAt)}</span>
                          {isMine && (
                            <span>
                              {msg.status === 'READ' ? (
                                <span
                                  className="text-indigo-600 flex items-center gap-0.5 font-bold"
                                  title="Seen"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" /> Seen
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-zinc-400">
                                  <Check className="w-3.5 h-3.5" /> Delivered
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 italic animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    <span>{activeConversation.store.name} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Area */}
              <div className="p-4 border-t border-zinc-200 bg-white">
                {/* Uploaded attachments preview */}
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-900"
                      >
                        <FileText className="w-3 h-3 text-indigo-600" />
                        <span className="truncate max-w-[120px] font-mono text-[10px]">
                          {att.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="text-indigo-400 hover:text-indigo-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors shrink-0 disabled:opacity-50"
                    title="Attach image or document (Max 10MB)"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${activeConversation.store.name}... (Press Enter to send)`}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-2.5 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:bg-white shadow-2xs"
                  />

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && attachments.length === 0) || isSending}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-xs shadow-xs transition-colors shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-400">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
