'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ShoppingBag,
  Store,
  ChevronRight,
  Plus,
  Minus,
  MessageSquare,
  Package,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  fetchProductByIdOrSlug,
  submitProductReview,
  analyzeProductReviewsAi,
} from '@/lib/api-client';
import { Product, ProductVariant } from '@/lib/mock-data';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/utils';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Form State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      setIsLoading(true);
      fetchProductByIdOrSlug(params.id as string).then((prod) => {
        if (prod) {
          setProduct(prod);
          setSelectedImage(prod.primaryImage);
          if (prod.variants && prod.variants.length > 0) {
            const defaultVar = prod.variants.find((v) => v.isDefault) || prod.variants[0];
            setSelectedVariant(defaultVar);
          }
          // Fetch AI review sentiment analysis
          analyzeProductReviewsAi(prod.id, prod.reviews).then((analysis) => {
            if (analysis) {
              setReviewAnalysis(analysis);
            }
          });
        }
        setIsLoading(false);
      });
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto w-full p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading product specifications...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto w-full p-8 flex flex-col items-center justify-center text-center">
          <Package className="w-12 h-12 text-zinc-400 mb-3" />
          <h2 className="text-xl font-bold text-zinc-900">Product not found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            The product you requested might have been archived or removed from the marketplace.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Return to catalog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeComparePrice = selectedVariant
    ? selectedVariant.compareAtPrice
    : product.compareAtPrice;
  const activeStock = selectedVariant ? selectedVariant.stockQuantity : product.stock;
  const activeSku = selectedVariant ? selectedVariant.sku : product.sku;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant || undefined);
    setToastMessage(
      `Added ${quantity}x "${product.title}${
        selectedVariant ? ` - ${selectedVariant.title}` : ''
      }" to cart`,
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedVariant || undefined);
    router.push('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    await submitProductReview(product.id, {
      rating: reviewRating,
      title: reviewTitle.trim() || undefined,
      comment: reviewComment.trim(),
    });

    setIsSubmittingReview(false);
    setShowReviewModal(false);
    setReviewComment('');
    setReviewTitle('');
    setToastMessage('Review submitted successfully!');
    setTimeout(() => setToastMessage(null), 3000);

    // Refresh product details
    const updated = await fetchProductByIdOrSlug(product.id);
    if (updated) setProduct(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Cart Toast Notification */}
      {toastMessage && (
        <div
          id="cart-toast"
          data-testid="cart-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-3 h-3" />
          </div>
          <span>{toastMessage}</span>
          <Link
            href="/cart"
            className="ml-2 font-semibold text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
          >
            View Cart
          </Link>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
          <Link href="/products" className="hover:text-zinc-900 transition-colors">
            Marketplace
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
          <Link
            href={`/products?categorySlug=${product.categorySlug}`}
            className="hover:text-zinc-900 transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-900 font-medium truncate max-w-[200px]">{product.title}</span>
        </nav>

        {/* Product Core Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-12 border-b border-zinc-200">
          {/* Gallery View */}
          <div className="space-y-4">
            <div className="aspect-4/3 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-2xs">
              <img
                src={selectedImage}
                alt={product.title}
                className="h-full w-full object-cover object-center"
              />
            </div>

            {/* Thumbnail selector */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-square w-18 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    selectedImage === img
                      ? 'border-indigo-600 shadow-2xs'
                      : 'border-zinc-200 hover:border-zinc-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details & Variant Configuration */}
          <div className="flex flex-col space-y-6">
            {/* Store and Rating Header */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                    <Store className="w-3.5 h-3.5 text-zinc-400" />
                    Sold by <span className="font-semibold text-zinc-900">{product.storeName}</span>
                  </span>
                  <Link
                    href={`/inbox?storeId=${product.storeId || 'store-apple-zone'}&storeName=${encodeURIComponent(product.storeName)}`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Message Seller</span>
                  </Link>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{product.rating}</span>
                  <span className="text-zinc-400 font-normal">({product.reviewCount} reviews)</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
                {product.title}
              </h1>

              {/* SKU & Stock Tag */}
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="font-mono text-zinc-500">SKU: {activeSku}</span>
                <span>•</span>
                <span
                  className={`font-medium ${
                    activeStock > 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {activeStock > 0 ? `${activeStock} units available` : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Price Presentation */}
            <div className="flex items-baseline gap-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50">
              <span className="text-3xl font-black text-zinc-900 tracking-tight">
                {formatPrice(activePrice)}
              </span>
              {activeComparePrice && (
                <span className="text-sm text-zinc-400 line-through">
                  {formatPrice(activeComparePrice)}
                </span>
              )}
              {activeComparePrice && (
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Save {formatPrice(activeComparePrice - activePrice)}
                </span>
              )}
            </div>

            {/* Description snippet */}
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {product.description}
            </p>

            {/* Variant Selector (Part 2 Requirement) */}
            {product.variants && product.variants.length > 0 && (
              <div className="pt-4 border-t border-zinc-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                    Select Variant / Configuration
                  </label>
                  <span className="text-xs text-indigo-600 font-medium">
                    {selectedVariant?.title}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-2xs'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-zinc-900">{v.title}</span>
                          <span className="text-xs font-bold text-zinc-900">
                            {formatPrice(v.price)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                          <span className="font-mono text-[10px]">{v.sku}</span>
                          <span className={v.stockQuantity > 0 ? 'text-zinc-500' : 'text-rose-500'}>
                            {v.stockQuantity > 0 ? `${v.stockQuantity} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="pt-4 border-t border-zinc-100 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-zinc-900">Quantity</span>
                <div className="flex items-center rounded-lg border border-zinc-200 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-2 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-zinc-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(activeStock, quantity + 1))}
                    disabled={quantity >= activeStock}
                    className="p-2 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={activeStock === 0}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition-colors shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={activeStock === 0}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition-colors shadow-xs"
                >
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-zinc-500 text-center">
              <div className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 flex flex-col items-center gap-1">
                <Truck className="w-4 h-4 text-zinc-700" />
                <span>Standard Delivery</span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 flex flex-col items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Buyer Protected</span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 flex flex-col items-center gap-1">
                <RotateCcw className="w-4 h-4 text-zinc-700" />
                <span>30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Attributes & Specs */}
        {product.attributes && Object.keys(product.attributes).length > 0 && (
          <section className="py-12 border-b border-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">Specifications & Attributes</h2>
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(product.attributes).map(([key, val], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'}>
                      <td className="px-4 py-3 font-semibold text-zinc-700 w-1/3 border-b border-zinc-100">
                        {key}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 border-b border-zinc-100">
                        {String(val)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Customer Reviews Section */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                Customer Reviews ({product.reviewCount})
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= Math.round(product.rating) ? 'fill-amber-400' : 'text-zinc-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-zinc-900">{product.rating} out of 5</span>
              </div>
            </div>

            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-colors shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              <span>Write a Review</span>
            </button>
          </div>

          {/* AI Customer Review Sentiment Analysis (Phase 3 Part 7) */}
          {reviewAnalysis && (
            <div
              id="ai-review-sentiment-card"
              data-testid="ai-review-sentiment-card"
              className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-white p-5 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100/60">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">
                      AI Review Sentiment & Complaint Synthesis
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Aggregated across {reviewAnalysis.totalReviews} verified community ratings
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {Math.round(reviewAnalysis.sentimentScore * 100)}% Positive Sentiment
                  </span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    Overall: {reviewAnalysis.overallSentiment}
                  </span>
                </div>
              </div>

              {/* Summary quote */}
              <p className="mt-3 text-xs text-zinc-700 leading-relaxed italic bg-white/70 rounded-xl p-3 border border-indigo-50">
                &ldquo;{reviewAnalysis.summary}&rdquo;
              </p>

              {/* Two Column Points: Positives vs Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3.5 space-y-2">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] uppercase tracking-wider">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                    Key Strengths Highlighted
                  </span>
                  <ul className="space-y-1 text-emerald-900 text-[11px]">
                    {reviewAnalysis.positivePoints?.map((pt: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3.5 space-y-2">
                  <span className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px] uppercase tracking-wider">
                    <ThumbsDown className="w-3.5 h-3.5 text-amber-600" />
                    Areas to Consider / Complaints
                  </span>
                  <ul className="space-y-1 text-amber-900 text-[11px]">
                    {reviewAnalysis.negativePoints?.map((pt: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900">{rev.userName}</span>
                      {rev.isVerified && (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="w-3 h-3" /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400">{rev.date}</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= rev.rating ? 'fill-amber-400' : 'text-zinc-200'
                        }`}
                      />
                    ))}
                  </div>

                  {rev.title && <h4 className="text-xs font-bold text-zinc-900">{rev.title}</h4>}
                  <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-xs text-zinc-500">
                No reviews yet. Be the first to share your experience with this product!
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Leave a Product Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-1">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setReviewRating(num)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          num <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-medium text-zinc-600 ml-2">
                    {reviewRating} of 5 stars
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-1">
                  Headline (optional)
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Great performance and battery life"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-1">
                  Detailed Feedback *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="What did you like or dislike? How was the build quality?"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Post Review'}
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
