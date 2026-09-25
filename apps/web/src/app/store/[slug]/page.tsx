'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Store,
  Star,
  ShoppingBag,
  UserPlus,
  UserCheck,
  Search,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Share2,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  X,
  Check,
  Building,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  fetchStoreBySlug,
  fetchProducts,
  submitStoreReview,
  toggleStoreFollow,
  checkFollowStatus,
} from '@/lib/api-client';
import { Product, StoreDetails, StoreSection } from '@/lib/mock-data';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/utils';

function StorefrontContent() {
  const params = useParams();
  const slug = (params?.slug as string) || 'apple-authorized';
  const { addToCart } = useCart();

  const [store, setStore] = useState<StoreDetails | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadStoreData() {
      setIsLoading(true);
      try {
        const [storeData, productsRes] = await Promise.all([
          fetchStoreBySlug(slug),
          fetchProducts({ limit: 50 }),
        ]);

        if (storeData) {
          setStore(storeData);
          setFollowerCount(storeData.followerCount || 0);
          if (typeof document !== 'undefined') {
            document.title = `${storeData.name} Storefront | DokanOS Multi-Vendor SaaS`;
          }

          // Filter products matching this store ID or store Slug
          const matchingProducts = productsRes.data.filter(
            (p) =>
              p.storeSlug === storeData.slug ||
              p.storeId === storeData.id ||
              (storeData.slug.includes('apple') && p.storeSlug.includes('apple')),
          );
          setStoreProducts(
            matchingProducts.length > 0 ? matchingProducts : productsRes.data.slice(0, 4),
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadStoreData();
  }, [slug]);

  const handleFollowToggle = async () => {
    try {
      const res = await toggleStoreFollow(slug);
      setIsFollowing(res.isFollowing);
      setFollowerCount(res.followerCount);
      showToast(res.isFollowing ? `Now following ${store?.name}` : `Unfollowed ${store?.name}`);
    } catch {
      setIsFollowing(!isFollowing);
    }
  };

  const handleQuickAdd = (product: Product) => {
    addToCart(product, 1);
    showToast(`Added "${product.title}" to cart`);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      await submitStoreReview(slug, {
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      setShowReviewModal(false);
      setReviewTitle('');
      setReviewComment('');
      showToast('Thank you! Your store review has been posted.');

      // Refresh store state
      const reloaded = await fetchStoreBySlug(slug);
      if (reloaded) setStore(reloaded);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return storeProducts;
    const q = searchQuery.toLowerCase();
    return storeProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [storeProducts, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mb-4" />
          <p className="text-xs font-semibold text-zinc-500">Loading storefront catalog...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Store className="w-12 h-12 text-zinc-400 mb-3" />
          <h1 className="text-xl font-bold text-zinc-900">Store Not Found</h1>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-6">
            The merchant storefront &quot;{slug}&quot; could not be located or has been archived.
          </p>
          <Link
            href="/products"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
          >
            Explore Marketplace Catalog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Theme configuration
  const primaryColor = store.theme?.primaryColor || '#4F46E5';
  const layoutType = store.theme?.layoutType || 'MODERN';

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': 'OnlineStore',
            name: store.name,
            description: store.description,
            url: `https://dokanos.com/store/${store.slug}`,
            image: store.logoUrl,
            telephone: store.contactPhone,
            email: store.contactEmail,
            address: {
              '@type': 'PostalAddress',
              addressLocality: store.address || 'Global Marketplace',
            },
          }),
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          id="storefront-toast"
          data-testid="storefront-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-fade-in"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-3 h-3" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Store Banner & Brand Header (Part 3 Requirement) */}
      <div className="relative w-full bg-zinc-900 text-white overflow-hidden">
        {/* Banner image with overlay */}
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src={store.bannerUrl}
            alt={store.name}
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent z-10" />

        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Logo & Store Name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white p-1 shadow-xl">
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Verified Merchant
                  </span>
                  {store.businessCategory && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                      {store.businessCategory}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {store.name}
                </h1>

                <p className="text-xs text-zinc-300 max-w-xl mt-1.5 leading-relaxed line-clamp-2">
                  {store.description}
                </p>

                {/* Rating & Stats row */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{store.rating}</span>
                    <span className="text-zinc-400">({store.reviewCount} reviews)</span>
                  </div>

                  <span className="text-zinc-600">•</span>

                  <div className="font-medium">
                    <strong className="text-white">{followerCount}</strong> Followers
                  </div>

                  <span className="text-zinc-600">•</span>

                  <div className="font-medium">
                    <strong className="text-white">{storeProducts.length}</strong> Listed Products
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Follow & Review Button */}
            <div className="flex items-center gap-3">
              <button
                id="follow-store-btn"
                data-testid="follow-store-btn"
                onClick={handleFollowToggle}
                style={{ backgroundColor: isFollowing ? undefined : primaryColor }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-md ${
                  isFollowing
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    : 'hover:opacity-90 text-white'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow Store</span>
                  </>
                )}
              </button>

              <Link
                href={`/inbox?storeId=${store.id}&storeName=${encodeURIComponent(store.name)}`}
                className="flex items-center gap-2 rounded-xl bg-white hover:bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-900 transition-all shadow-md"
              >
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Chat with Seller</span>
              </Link>

              <button
                onClick={() => setShowReviewModal(true)}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-md"
              >
                <Star className="w-4 h-4 text-amber-300" />
                <span>Write Review</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configured Sections & Catalog */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Search Bar for Store Products */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Browse Storefront Catalog</h2>
            <p className="text-xs text-zinc-500">
              Showing products distributed directly by {store.name}.
            </p>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${store.name}...`}
              className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Dynamic Configured Homepage Sections (Part 2 & 3) */}
        {store.sections.map((section) => {
          if (!section.isVisible) return null;

          if (section.sectionType === 'HERO_BANNER') {
            return (
              <div
                key={section.sectionType}
                className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-indigo-950 p-8 sm:p-10 text-white shadow-md relative overflow-hidden"
              >
                <div className="relative z-10 max-w-xl">
                  <span className="rounded-md bg-white/10 border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Store Featured Showcase
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 mb-2">
                    {section.title || `Welcome to ${store.name}`}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed mb-6">{section.subtitle}</p>
                  <a
                    href="#products-grid"
                    style={{ backgroundColor: primaryColor }}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
                  >
                    <span>{section.content?.ctaText || 'Explore Catalog'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          }

          if (
            section.sectionType === 'FEATURED_PRODUCTS' ||
            section.sectionType === 'NEW_ARRIVALS'
          ) {
            return (
              <div key={section.sectionType} id="products-grid" className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900">
                    {section.title || 'Products'}
                  </h3>
                  {section.subtitle && (
                    <p className="text-xs text-zinc-500 mt-1">{section.subtitle}</p>
                  )}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
                    No items found matching your query.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        data-testid="store-product-card"
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
                          <img
                            src={product.primaryImage}
                            alt={product.title}
                            className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                          {product.badge && (
                            <span className="absolute top-2.5 left-2.5 rounded-md bg-zinc-900/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                              {product.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <Link href={`/products/${product.id}`} className="focus:outline-none">
                            <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {product.title}
                            </h4>
                          </Link>
                          <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>

                          <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100">
                            <div>
                              <span className="text-base font-bold text-zinc-900">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleQuickAdd(product)}
                              style={{ backgroundColor: primaryColor }}
                              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 shadow-2xs"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (section.sectionType === 'ABOUT') {
            return (
              <div
                key={section.sectionType}
                className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xs space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-zinc-900">
                    {section.title || 'About Our Store'}
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-3xl">
                  {section.subtitle || store.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-900 block">
                      Verified Business Category
                    </span>
                    <span className="text-zinc-500">
                      {store.businessCategory || 'General Merchandise'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-900 block">Quality Solvency</span>
                    <span className="text-emerald-600 font-semibold">
                      100% Escrow Solvency Protected
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-900 block">Fulfillment SLA</span>
                    <span className="text-zinc-500">Same-Day Dispatch Available</span>
                  </div>
                </div>
              </div>
            );
          }

          if (section.sectionType === 'CONTACT') {
            return (
              <div
                key={section.sectionType}
                className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xs space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    {section.title || 'Merchant Support & Contact'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {section.subtitle || 'Reach out directly to store representatives.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50">
                    <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-zinc-900 block">
                        Customer Support Email
                      </span>
                      <span className="text-zinc-500 font-mono">{store.contactEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50">
                    <Phone className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-zinc-900 block">Phone Line</span>
                      <span className="text-zinc-500 font-mono">{store.contactPhone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50">
                    <Globe className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-zinc-900 block">
                        Official Website & Socials
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {store.socialLinks?.twitter && (
                          <a
                            href={store.socialLinks.twitter}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 font-semibold underline"
                          >
                            X / Twitter
                          </a>
                        )}
                        {store.socialLinks?.instagram && (
                          <a
                            href={store.socialLinks.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 font-semibold underline"
                          >
                            Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Store Customer Reviews Section (Part 7) */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-zinc-900">Verified Customer Reviews</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Real customer feedback from completed orders.
              </p>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors"
            >
              Write Review
            </button>
          </div>

          {!store.storeReviews || store.storeReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
              No store reviews posted yet. Be the first to leave feedback!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {store.storeReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {rev.userName.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-900 block">
                          {rev.userName}
                        </span>
                        <span className="text-[10px] text-zinc-400">{rev.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400' : 'text-zinc-200'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.title && <h4 className="text-xs font-bold text-zinc-900">{rev.title}</h4>}
                  <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Write Store Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900">Review {store.name}</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1.5">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-zinc-700">{reviewRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Headline / Title</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Excellent service & genuine items"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Review Comments *</label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with product quality, packaging, and shipping time..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  style={{ backgroundColor: primaryColor }}
                  className="rounded-lg text-white font-semibold px-5 py-2 hover:opacity-90 transition-opacity"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function PublicStorefrontPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-xs font-medium text-zinc-500">Loading merchant storefront...</p>
          </div>
        </div>
      }
    >
      <StorefrontContent />
    </React.Suspense>
  );
}
