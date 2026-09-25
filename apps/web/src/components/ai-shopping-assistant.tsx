'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShoppingCart,
  ArrowRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { sendShoppingChat } from '@/lib/api-client';
import { useCart } from '@/lib/cart-context';
import { Product } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedProducts?: any[];
  timestamp: string;
}

export function AIShoppingAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  const { addToCart } = useCart();

  const defaultWelcomeMessage: ChatMessage = {
    id: 'msg-1',
    sender: 'assistant',
    text: 'Hello! I am your DokanOS AI Commerce Assistant. Ask me anything like *"I need a laptop for programming under $1000"* or *"Show me comfortable running shoes"*.',
    timestamp: 'Just now',
  };

  const [messages, setMessages] = useState<ChatMessage[]>([defaultWelcomeMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dokanos_ai_conversations');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const saveMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dokanos_ai_conversations', JSON.stringify(newMessages));
      } catch {
        // ignore
      }
    }
  };

  const handleClearHistory = () => {
    const resetMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: 'Conversation history reset. How can I assist with your shopping today?',
      timestamp: 'Just now',
    };
    saveMessages([resetMsg]);
  };

  const suggestedPrompts = [
    'Laptop for programming under $1000',
    'Best wireless noise-canceling headphones',
    'Comfortable shoes for walking',
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedWithUser = [...messages, userMsg];
    saveMessages(updatedWithUser);
    if (!customText) setInputMessage('');
    setIsLoading(true);

    try {
      const res = await sendShoppingChat(textToSend);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.reply || 'Here are the top matches from our vector catalog:',
        recommendedProducts: res.recommendedProducts || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      saveMessages([...updatedWithUser, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'I am temporarily operating in offline mode, but you can explore our full product catalog!',
        timestamp: 'Just now',
      };
      saveMessages([...updatedWithUser, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: any) => {
    const prodObj: Product = {
      id: product.id,
      title: product.title,
      slug: product.slug || product.id,
      description: 'AI Recommended marketplace product.',
      price: parseFloat(product.price) || 99,
      category: product.categoryName || 'Marketplace',
      categorySlug: (product.categoryName || 'marketplace').toLowerCase().replace(/\s+/g, '-'),
      sku: `AI-${product.id}`,
      stock: 50,
      lowStockThreshold: 5,
      rating: parseFloat(product.rating) || 5.0,
      reviewCount: 12,
      primaryImage:
        product.imageUrl ||
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
      images: [
        product.imageUrl ||
          'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
      ],
      storeId: 'store-1',
      storeName: product.storeName || 'DokanOS Verified Store',
      storeSlug: 'dokanos-store',
      storeRating: 5.0,
      variants: [],
      attributes: {},
    };

    addToCart(prodObj, 1);

    setAddedItems((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [product.id]: false }));
    }, 2500);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Shopping Assistant"
          aria-expanded={isOpen}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-3 shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" aria-hidden="true" />
          <span className="text-xs">Ask AI Shopping Assistant</span>
        </button>
      )}

      {/* Slide-over Drawer Chat Interface */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="DokanOS AI Commerce Assistant"
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-2xs animate-fade-in"
        >
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-zinc-200">
            {/* Header */}
            <div className="p-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-amber-300">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wide">DokanOS AI Commerce Assistant</h3>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"
                      aria-hidden="true"
                    />{' '}
                    RAG & pgvector active
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  aria-label="Reset conversation memory"
                  title="Reset conversation memory"
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close AI Shopping Assistant"
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-white"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Chat Conversation Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/50 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      msg.sender === 'user' ? 'bg-zinc-900 text-white' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 space-y-3 ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white border border-zinc-200 text-zinc-800 shadow-2xs rounded-tl-none'
                    }`}
                  >
                    <p className="leading-relaxed text-xs">{msg.text}</p>

                    {/* Embedded Recommended Product Cards */}
                    {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          AI Recommended Matches ({msg.recommendedProducts.length}):
                        </span>
                        {msg.recommendedProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors"
                          >
                            {prod.imageUrl && (
                              <img
                                src={prod.imageUrl}
                                alt=""
                                className="h-12 w-12 rounded-lg object-cover border border-zinc-200 shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/products/${prod.id}`}
                                className="font-bold text-zinc-900 hover:text-indigo-600 truncate block text-xs"
                              >
                                {prod.title}
                              </Link>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-black text-indigo-600 text-xs">
                                  {formatPrice(parseFloat(prod.price))}
                                </span>
                                {prod.recommendationReason && (
                                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold truncate max-w-[120px]">
                                    {prod.recommendationReason}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddToCart(prod)}
                              className={`p-2 rounded-lg text-white font-medium transition-all shrink-0 ${
                                addedItems[prod.id]
                                  ? 'bg-emerald-600'
                                  : 'bg-zinc-900 hover:bg-zinc-800'
                              }`}
                              title="Add to Cart"
                            >
                              {addedItems[prod.id] ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <ShoppingCart className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-[9px] text-zinc-400 block text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs py-2">
                  <Bot className="w-4 h-4 text-indigo-600 animate-bounce" />
                  <span>Searching pgvector catalog & synthesizing LLM recommendation...</span>
                </div>
              )}
            </div>

            {/* Suggested Chips & Input Form */}
            <div className="p-3 bg-white border-t border-zinc-200 space-y-2 text-xs">
              {messages.length < 3 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="rounded-full bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 border border-zinc-200 px-3 py-1 text-[11px] font-medium transition-colors text-zinc-700"
                    >
                      {prompt} &rarr;
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask AI: e.g. I need headphones under $200..."
                  className="flex-1 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-indigo-600 bg-zinc-50/50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
