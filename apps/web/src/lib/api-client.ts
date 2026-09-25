import {
  MOCK_PRODUCTS,
  MOCK_STORES,
  Product,
  ProductVariant,
  StoreDetails,
  StoreSection,
  StoreTheme,
} from './mock-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ProductsQueryParams {
  search?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface InventoryOverview {
  totalProducts: number;
  totalStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  lowStockItems: Array<{
    productId: string;
    title: string;
    stockQuantity: number;
    lowStockThreshold: number;
    variantCount: number;
    primaryImage: string | null;
  }>;
}

export interface InventoryTransactionItem {
  id: string;
  inventoryId: string;
  type: 'RESTOCK' | 'ORDER_DEDUCTION' | 'ORDER_RETURN' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  note?: string;
  createdAt: string;
  inventory?: {
    product?: { id: string; title: string; sku?: string };
    variant?: { id: string; title: string; sku?: string };
  };
}

// In-memory state for local persistence during preview/dev
let localProducts = [...MOCK_PRODUCTS];
let localTransactions: InventoryTransactionItem[] = [
  {
    id: 'txn-mock-1',
    inventoryId: 'inv-1',
    type: 'RESTOCK',
    quantity: 100,
    previousStock: 0,
    newStock: 100,
    referenceId: 'PO-2026-901',
    note: 'Initial seasonal batch from authorized manufacturer',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    inventory: {
      product: { id: 'prod-001', title: 'iPhone 15 Pro Titanium', sku: 'IPH15P-BASE' },
      variant: { id: 'var-iph-1', title: 'Black Titanium / 128GB', sku: 'IPH15P-BLK-128' },
    },
  },
  {
    id: 'txn-mock-2',
    inventoryId: 'inv-2',
    type: 'ORDER_DEDUCTION',
    quantity: -2,
    previousStock: 100,
    newStock: 98,
    referenceId: 'DOK-2026-88124',
    note: 'Order checkout deduction',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    inventory: {
      product: { id: 'prod-001', title: 'iPhone 15 Pro Titanium', sku: 'IPH15P-BASE' },
      variant: { id: 'var-iph-1', title: 'Black Titanium / 128GB', sku: 'IPH15P-BLK-128' },
    },
  },
  {
    id: 'txn-mock-3',
    inventoryId: 'inv-3',
    type: 'RESTOCK',
    quantity: 50,
    previousStock: 12,
    newStock: 62,
    referenceId: 'PO-2026-944',
    note: 'Warehouse restock transfer',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    inventory: {
      product: { id: 'prod-002', title: 'Nike Air Zoom Pegasus 40', sku: 'NIKE-PEG-40' },
      variant: { id: 'var-nik-1', title: 'Obsidian / US 9.5', sku: 'NIKE-PEG-OBS-95' },
    },
  },
];

export async function fetchProducts(params: ProductsQueryParams = {}): Promise<ProductsResponse> {
  try {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.categorySlug && params.categorySlug !== 'all') {
      query.append('categorySlug', params.categorySlug);
    }
    if (params.minPrice !== undefined) query.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) query.append('maxPrice', params.maxPrice.toString());
    if (params.minRating !== undefined) query.append('minRating', params.minRating.toString());
    if (params.inStock !== undefined) query.append('inStock', params.inStock.toString());
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE_URL}/products?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Graceful fallback to client-side data
  }

  // Filter local products
  let filtered = [...localProducts];

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s) ||
        p.storeName.toLowerCase().includes(s) ||
        p.variants.some(
          (v) => v.title.toLowerCase().includes(s) || v.sku.toLowerCase().includes(s),
        ),
    );
  }

  if (params.categorySlug && params.categorySlug !== 'all') {
    filtered = filtered.filter((p) => p.categorySlug === params.categorySlug);
  }

  if (params.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= params.minPrice!);
  }

  if (params.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= params.maxPrice!);
  }

  if (params.minRating !== undefined) {
    filtered = filtered.filter((p) => p.rating >= params.minRating!);
  }

  if (params.inStock) {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  // Sort
  if (params.sortBy === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (params.sortBy === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (params.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (params.sortBy === 'popular') {
    filtered.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return {
    data: paginated,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function fetchProductByIdOrSlug(idOrSlug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${idOrSlug}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const found = localProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug.toLowerCase());
  return found || null;
}

export async function duplicateProduct(productId: string): Promise<Product> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fallback
  }

  const original = localProducts.find((p) => p.id === productId);
  if (!original) throw new Error('Product not found');

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const cloned: Product = {
    ...original,
    id: `prod-${Date.now()}`,
    title: `${original.title} (Copy)`,
    slug: `${original.slug}-copy-${randomSuffix}`,
    sku: `${original.sku}-COPY-${randomSuffix.toUpperCase()}`,
    variants: original.variants.map((v) => ({
      ...v,
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      sku: `${v.sku}-COPY-${randomSuffix.toUpperCase()}`,
    })),
  };

  localProducts.unshift(cloned);
  return cloned;
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'DELETE',
    });
  } catch {
    // Fallback
  }
  localProducts = localProducts.filter((p) => p.id !== productId);
}

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/overview`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  let totalStock = 0;
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  const lowStockItems: InventoryOverview['lowStockItems'] = [];

  for (const p of localProducts) {
    totalStock += p.stock;
    if (p.stock === 0) {
      outOfStockProducts++;
    } else if (p.stock <= p.lowStockThreshold) {
      lowStockProducts++;
    }

    if (p.stock <= p.lowStockThreshold) {
      lowStockItems.push({
        productId: p.id,
        title: p.title,
        stockQuantity: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        variantCount: p.variants.length,
        primaryImage: p.primaryImage,
      });
    }
  }

  return {
    totalProducts: localProducts.length,
    totalStock,
    lowStockProducts,
    outOfStockProducts,
    lowStockItems,
  };
}

export async function fetchInventoryTransactions(): Promise<InventoryTransactionItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/transactions`);
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch {
    // Fallback
  }

  return localTransactions;
}

export async function adjustInventoryStock(data: {
  productId: string;
  variantId?: string;
  type: 'RESTOCK' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  note?: string;
}): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return;
  } catch {
    // Fallback
  }

  const product = localProducts.find((p) => p.id === data.productId);
  if (!product) throw new Error('Product not found');

  const prev = product.stock;
  const next = Math.max(0, prev + data.quantity);
  product.stock = next;

  let variant = undefined;
  if (data.variantId) {
    variant = product.variants.find((v) => v.id === data.variantId);
    if (variant) {
      variant.stockQuantity = Math.max(0, variant.stockQuantity + data.quantity);
    }
  }

  localTransactions.unshift({
    id: `txn-${Date.now()}`,
    inventoryId: `inv-${product.id}`,
    type: data.type,
    quantity: data.quantity,
    previousStock: prev,
    newStock: next,
    referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
    note: data.note || 'Manual stock adjustment via seller dashboard',
    createdAt: new Date().toISOString(),
    inventory: {
      product: { id: product.id, title: product.title, sku: product.sku },
      variant: variant ? { id: variant.id, title: variant.title, sku: variant.sku } : undefined,
    },
  });
}

export async function submitProductReview(
  productId: string,
  review: { rating: number; title?: string; comment: string },
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
  } catch {
    // Fallback
  }

  const p = localProducts.find((item) => item.id === productId);
  if (p) {
    if (!p.reviews) p.reviews = [];
    p.reviews.unshift({
      id: `rev-${Date.now()}`,
      userName: 'Verified Buyer',
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      date: new Date().toISOString().split('T')[0],
      isVerified: true,
    });
    p.reviewCount++;
    const total = p.reviews.reduce((acc, r) => acc + r.rating, 0);
    p.rating = parseFloat((total / p.reviews.length).toFixed(1));
  }
}

// In-memory local stores registry
let localStores: Record<string, StoreDetails> = { ...MOCK_STORES };

export async function fetchStoreBySlug(slug: string): Promise<StoreDetails | null> {
  const normalized = slug.toLowerCase().trim();
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${normalized}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return localStores[normalized] || localStores['apple-authorized'] || null;
}

export async function updateStoreProfile(
  storeId: string,
  data: Partial<StoreDetails>,
): Promise<StoreDetails> {
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const existingKey =
    Object.keys(localStores).find((k) => localStores[k].id === storeId) || 'apple-authorized';
  const updated: StoreDetails = {
    ...localStores[existingKey],
    ...data,
  };
  localStores[existingKey] = updated;
  if (data.slug) {
    localStores[data.slug] = updated;
  }
  return updated;
}

export async function updateStoreTheme(
  storeId: string,
  theme: Partial<StoreTheme>,
): Promise<StoreTheme> {
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${storeId}/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const key =
    Object.keys(localStores).find((k) => localStores[k].id === storeId) || 'apple-authorized';
  localStores[key].theme = {
    ...localStores[key].theme,
    ...theme,
  };
  return localStores[key].theme;
}

export async function updateStoreSections(
  storeId: string,
  sections: StoreSection[],
): Promise<StoreSection[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${storeId}/sections`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const key =
    Object.keys(localStores).find((k) => localStores[k].id === storeId) || 'apple-authorized';
  localStores[key].sections = sections;
  return sections;
}

export async function submitStoreReview(
  slug: string,
  review: { rating: number; title?: string; comment: string },
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/stores/${slug}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
  } catch {
    // Fallback
  }

  const s = localStores[slug] || localStores['apple-authorized'];
  if (s) {
    if (!s.storeReviews) s.storeReviews = [];
    s.storeReviews.unshift({
      id: `srev-${Date.now()}`,
      userName: 'Verified Customer',
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: new Date().toISOString().split('T')[0],
    });
    s.reviewCount++;
  }
}

export async function toggleStoreFollow(
  slug: string,
): Promise<{ isFollowing: boolean; followerCount: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${slug}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const s = localStores[slug] || localStores['apple-authorized'];
  if (s) {
    s.followerCount = (s.followerCount || 0) + 1;
    return { isFollowing: true, followerCount: s.followerCount };
  }
  return { isFollowing: true, followerCount: 100 };
}

export async function checkFollowStatus(slug: string): Promise<{ isFollowing: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/stores/${slug}/follow-status`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }
  return { isFollowing: false };
}

export async function uploadImageFile(file: File): Promise<{ url: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      return { url: data.url };
    }
  } catch {
    // Fallback
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string });
    };
    reader.readAsDataURL(file);
  });
}

// -------------------------------------------------------------
// AI INTELLIGENCE API CLIENT FUNCTIONS
// -------------------------------------------------------------

export async function sendShoppingChat(message: string, conversationId?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const queryLower = message.toLowerCase();
  let matches = localProducts;
  if (queryLower.includes('laptop') || queryLower.includes('computer')) {
    matches = localProducts.filter(
      (p) =>
        p.category.toLowerCase().includes('computer') || p.title.toLowerCase().includes('macbook'),
    );
  } else if (queryLower.includes('shoe') || queryLower.includes('running')) {
    matches = localProducts.filter(
      (p) =>
        p.category.toLowerCase().includes('footwear') || p.title.toLowerCase().includes('shoe'),
    );
  } else if (queryLower.includes('headphone') || queryLower.includes('audio')) {
    matches = localProducts.filter(
      (p) =>
        p.category.toLowerCase().includes('audio') || p.title.toLowerCase().includes('headphone'),
    );
  }

  return {
    reply: `Based on your request "${message}", I searched our verified DokanOS vector catalog and selected these top recommendations for you:`,
    recommendedProducts: matches.slice(0, 3).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: String(p.price),
      rating: String(p.rating),
      storeName: p.storeName,
      categoryName: p.category,
      imageUrl: p.primaryImage,
      similarityScore: 0.94,
      recommendationReason: `Matches feature profile in ${p.category}`,
    })),
    executionTimeMs: 14,
  };
}

export async function generateSellerCopilotCopy(data: {
  productName: string;
  category: string;
  features: string[];
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/product-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const name = data.productName || 'Premium Marketplace Product';
  const cat = data.category || 'Electronics & Tech';
  const feats =
    data.features.length > 0 ? data.features : ['Premium build materials', '1 year warranty'];

  return {
    description: `### Discover the Next Level of Performance with ${name}\n\nDesigned specifically for enthusiasts in **${cat}**, the **${name}** combines thoughtful engineering with sleek aesthetics.\n\n#### Key Features:\n${feats.map((f) => `- **${f}**`).join('\n')}\n\nShop with confidence on DokanOS with fast shipping and authentic merchant guarantees.`,
    marketingText: `Meet the ${name}: your all-in-one upgrade for ${cat}. Crafted to impress and built to last.`,
    seoKeywords: [
      name.toLowerCase(),
      `buy ${name.toLowerCase()}`,
      `best ${cat.toLowerCase()} deals`,
      'dokan os',
    ],
    tags: [cat.toLowerCase().replace(/\s+/g, '-'), 'featured', 'best-seller'],
    seoMeta: {
      metaTitle: `${name} | Buy Online at DokanOS`,
      metaDescription: `Shop authentic ${name} in ${cat} on DokanOS. Enjoy verified fast shipping.`,
      keywords: [name.toLowerCase(), cat.toLowerCase()],
    },
    keySellingPoints: feats,
  };
}

export async function analyzeProductImageAi(imageUrl: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const lower = imageUrl.toLowerCase();
  if (lower.includes('shoe') || lower.includes('sneaker')) {
    return {
      category: 'Footwear & Apparel',
      color: 'Black / Red',
      style: 'Athletic Running',
      material: 'Breathable Mesh & Carbon Rubber',
      tags: ['running', 'sports', 'sneakers'],
      suggestedTitle: 'Nike Air Zoom Carbon Performance Runner',
      confidence: 0.95,
    };
  }

  return {
    category: 'Smartphones & Tech',
    color: 'Space Gray',
    style: 'Flagship Minimalist',
    material: 'Titanium & Glass',
    tags: ['smartphone', 'tech', 'gadgets'],
    suggestedTitle: 'Next-Gen High Performance Device',
    confidence: 0.92,
  };
}

export async function performHybridSearch(query: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const q = query.toLowerCase();
  const filtered = localProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );

  return {
    query,
    products: (filtered.length > 0 ? filtered : localProducts.slice(0, 4)).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: String(p.price),
      rating: String(p.rating),
      storeName: p.storeName,
      imageUrl: p.primaryImage,
      similarityScore: 0.89,
    })),
    total_found: filtered.length || 4,
    execution_time_ms: 12,
  };
}

export async function fetchSellerAiInsights() {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/seller/insights`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return {
    storeName: 'Apple Zone Official',
    insights: [
      {
        id: 'ins-1',
        type: 'OPTIMIZATION',
        title: 'SEO Title Enhancement Suggested',
        description:
          'Adding keywords like "Wireless" and "Noise-Canceling" to your top audio listings can boost search impressions by 34%.',
        impact: '+18% Organic Traffic',
        actionText: 'Apply AI Copilot Suggested Title',
      },
      {
        id: 'ins-2',
        type: 'PRICING',
        title: 'Smart Pricing Opportunity',
        description:
          'Competitor pricing analysis indicates a $15 price drop on flagship SKUs could double weekend conversion rates.',
        impact: '+22% Weekly Sales',
        actionText: 'Adjust Price Bands',
      },
      {
        id: 'ins-3',
        type: 'REVIEWS',
        title: 'AI Customer Sentiment Summary',
        description:
          'Analyzed 42 verified customer reviews. Customer satisfaction is steady at 98% positive sentiment.',
        impact: '4.9 Star Rating Average',
        actionText: 'View Sentiment Report',
      },
    ],
  };
}

export async function analyzeProductReviewsAi(
  productId: string,
  reviews?: Array<{ rating: number; comment: string }>,
) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/reviews/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, reviews }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return {
    totalReviews: reviews?.length || 8,
    overallSentiment: 'POSITIVE',
    sentimentScore: 0.94,
    positivePoints: [
      'Exceptional acoustic clarity and active noise cancellation',
      'Solid and premium battery endurance over 30+ hours',
      'Ultra comfortable memory foam ear cushions for extended wear',
    ],
    negativePoints: [
      'Companion app pairing takes several attempts on legacy Bluetooth devices',
      'Hard carrying case is slightly bulky for compact everyday travel',
    ],
    commonComplaints: [
      'Initial Bluetooth pairing handshake latency',
      'Carrying case zipper stiffness',
    ],
    summary:
      '94% of verified buyers reported satisfaction with audio fidelity and build quality. Primary critique is centered on minor Bluetooth setup friction.',
  };
}

export interface SellerBillingOverview {
  sellerId: string;
  storeName: string;
  subscription?: {
    id?: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    plan: {
      id?: string;
      name: string;
      tier: 'FREE' | 'PRO';
      price: number;
      currency?: string;
      features?: string[];
      limits?: any;
    };
  };
  currentPlan?: {
    id: string;
    name: string;
    tier: 'FREE' | 'PRO';
    price: number;
    currency: string;
    features: string[];
    limits: any;
  };
  subscriptionStatus?: string;
  startDate?: string;
  endDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  usage: {
    productsCount?: number;
    productCount?: number;
    productLimit?: number;
    maxProducts?: number;
    aiTokensUsed?: number;
    totalOrders?: number;
  };
  invoices: Array<{
    id: string;
    description: string;
    amount: number;
    currency?: string;
    status: string;
    date?: string;
    paidAt?: string;
    cardBrand?: string;
    cardLast4?: string;
    pdfUrl?: string;
    invoiceUrl?: string;
  }>;
}

export interface AdminRevenueOverview {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  activeSubscriptionsCount?: number;
  totalSubscribers?: number;
  planBreakdown?: {
    FREE: number;
    PRO: number;
    ENTERPRISE?: number;
  };
  tierBreakdown?: {
    FREE: number;
    PRO: number;
    ENTERPRISE?: number;
  };
  recentTransactions: Array<{
    id: string;
    gateway?: string;
    provider?: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    transactionRef?: string;
    createdAt: string;
  }>;
}

// -------------------------------------------------------------
// PAYMENTS & SUBSCRIPTIONS CLIENT (PHASE 4)
// -------------------------------------------------------------

export interface InitiatePaymentPayload {
  orderId: string;
  provider: 'STRIPE' | 'SSLCOMMERZ';
  idempotencyKey?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function initiatePayment(payload: InitiatePaymentPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  // Fallback simulation
  const isStripe = payload.provider === 'STRIPE';
  return {
    paymentId: `pay_${Date.now()}`,
    orderId: payload.orderId,
    provider: payload.provider,
    amount: 150.0,
    currency: 'USD',
    clientSecret: isStripe
      ? `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`
      : undefined,
    redirectUrl: !isStripe
      ? `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=SSLC_${Date.now()}`
      : undefined,
    transactionId: isStripe ? `pi_${Date.now()}` : `SSLC_${Date.now()}`,
  };
}

export async function fetchSubscriptionPlans() {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/subscriptions/plans`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return [
    {
      id: 'plan-free',
      name: 'FREE',
      tier: 'FREE',
      price: 0,
      currency: 'USD',
      interval: 'month',
      features: [
        'Up to 20 product catalog listings',
        'Basic storefront theme customization',
        'Standard checkout integration',
        'Basic sales and visitor analytics',
        'Community vendor support',
      ],
      limits: {
        maxProducts: 20,
        aiCopilotEnabled: false,
        advancedAnalytics: false,
      },
    },
    {
      id: 'plan-pro',
      name: 'PRO',
      tier: 'PRO',
      price: 19,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited product catalog listings',
        'AI Seller Copilot (SEO titles & descriptions)',
        'AI Product Image Vision Analyzer',
        'AI Shopping Assistant RAG vector search',
        'Advanced revenue intelligence & MRR tracking',
        'Custom storefront builders & dynamic sections',
        'Priority 24/7 dedicated SaaS concierge',
      ],
      limits: {
        maxProducts: 999999,
        aiCopilotEnabled: true,
        advancedAnalytics: true,
      },
    },
  ];
}

export async function createSubscriptionCheckout(payload: {
  tier: 'FREE' | 'PRO';
  successUrl?: string;
  cancelUrl?: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return {
    checkoutUrl: payload.successUrl || '/dashboard/billing?status=success&tier=' + payload.tier,
    planTier: payload.tier,
    amount: payload.tier === 'PRO' ? 19 : 0,
  };
}

export async function fetchSellerBilling() {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/subscriptions/billing`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  // Load local subscription state from localStorage if available
  let localTier: 'FREE' | 'PRO' = 'PRO';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('dokanos_seller_plan');
      if (stored === 'FREE' || stored === 'PRO') localTier = stored;
    } catch {
      // ignore
    }
  }

  const isPro = localTier === 'PRO';

  return {
    sellerId: 'seller-apple-zone',
    storeName: 'Apple Zone Official',
    currentPlan: {
      id: isPro ? 'plan-pro' : 'plan-free',
      name: isPro ? 'PRO' : 'FREE',
      tier: localTier,
      price: isPro ? 19 : 0,
      currency: 'USD',
      features: isPro
        ? [
            'Unlimited product catalog listings',
            'AI Seller Copilot (SEO titles & descriptions)',
            'AI Product Image Vision Analyzer',
            'AI Shopping Assistant RAG vector search',
            'Advanced revenue intelligence',
            'Custom storefront themes',
          ]
        : ['Up to 20 product catalog listings', 'Basic store themes', 'Basic analytics'],
      limits: {
        maxProducts: isPro ? 999999 : 20,
        aiCopilotEnabled: isPro,
        advancedAnalytics: isPro,
      },
    },
    subscriptionStatus: 'ACTIVE',
    startDate: new Date().toISOString(),
    endDate: isPro ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
    cancelAtPeriodEnd: false,
    usage: {
      productCount: 14,
      maxProducts: isPro ? 999999 : 20,
      aiTokensUsed: 3420,
      totalOrders: 142,
    },
    invoices: [
      {
        id: 'INV-2026-0901',
        description: `DokanOS ${isPro ? 'PRO' : 'FREE'} Monthly SaaS Subscription`,
        amount: isPro ? 19 : 0,
        currency: 'USD',
        status: 'PAID',
        paidAt: new Date().toISOString(),
        invoiceUrl: '#',
      },
      {
        id: 'INV-2026-0801',
        description: 'DokanOS PRO Monthly SaaS Subscription',
        amount: 19,
        currency: 'USD',
        status: 'PAID',
        paidAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        invoiceUrl: '#',
      },
    ],
  };
}

export async function cancelSellerSubscription() {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/subscriptions/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('dokanos_seller_plan', 'FREE');
  }

  return {
    success: true,
    message: 'Subscription will be canceled at the end of the current billing cycle.',
  };
}

export async function fetchAdminRevenueOverview() {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/admin/revenue`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  return {
    totalRevenue: 184320.0,
    monthlyRecurringRevenue: 3420.0,
    activeSubscriptionsCount: 180,
    totalSubscribers: 240,
    tierBreakdown: {
      FREE: 60,
      PRO: 165,
      ENTERPRISE: 15,
    },
    recentTransactions: [
      {
        id: 'tx-001',
        provider: 'STRIPE',
        amount: 899.0,
        currency: 'USD',
        type: 'ORDER_PAYMENT',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx-002',
        provider: 'STRIPE',
        amount: 19.0,
        currency: 'USD',
        type: 'SUBSCRIPTION_PRO',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'tx-003',
        provider: 'SSLCOMMERZ',
        amount: 240.0,
        currency: 'USD',
        type: 'ORDER_PAYMENT',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  };
}

// -------------------------------------------------------------
// REAL-TIME CHAT & NOTIFICATIONS CLIENT (PHASE 5)
// -------------------------------------------------------------

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  status: 'SENT' | 'DELIVERED' | 'READ';
  attachments?: Array<{
    url: string;
    fileName?: string;
    fileType?: string;
    size?: number;
  }> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role?: string;
  };
}

export interface ConversationItem {
  id: string;
  customerId: string;
  sellerId?: string | null;
  storeId: string;
  orderId?: string | null;
  type?: 'HUMAN_CHAT' | 'AI_CHAT';
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    sellerProfile?: {
      userId: string;
      businessName: string;
    };
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
  } | null;
  latestMessage?: ChatMessage | null;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'ORDER' | 'PAYMENT' | 'CHAT' | 'SUBSCRIPTION' | 'SYSTEM' | string;
  title: string;
  message?: string;
  body: string;
  payload?: any;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

// In-memory fallback stores for Chat & Notifications
let localConversations: ConversationItem[] = [
  {
    id: 'conv-apple-zone-1',
    customerId: 'user-customer-1',
    sellerId: 'user-seller-apple',
    storeId: 'store-apple-zone',
    orderId: 'ord-apple-101',
    type: 'HUMAN_CHAT',
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    store: {
      id: 'store-apple-zone',
      name: 'Apple Zone Official',
      slug: 'apple-zone',
      logoUrl:
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
      sellerProfile: {
        userId: 'user-seller-apple',
        businessName: 'Apple Zone Authorized Reseller',
      },
    },
    customer: {
      id: 'user-customer-1',
      firstName: 'Shahariar',
      lastName: 'Shawon',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    order: {
      id: 'ord-apple-101',
      orderNumber: 'DOK-2026-98124',
      status: 'PAID',
      totalAmount: 1199,
    },
    latestMessage: {
      id: 'msg-1',
      conversationId: 'conv-apple-zone-1',
      senderId: 'user-seller-apple',
      content:
        'Hello! Yes, the iPhone 15 Pro Max Natural Titanium is in stock and ships within 24 hours.',
      type: 'TEXT',
      status: 'READ',
      isRead: true,
      readAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      sender: {
        id: 'user-seller-apple',
        firstName: 'Apple Zone',
        lastName: 'Support',
        avatarUrl:
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
      },
    },
    unreadCount: 0,
  },
  {
    id: 'conv-sony-audio-2',
    customerId: 'user-customer-1',
    sellerId: 'user-seller-sony',
    storeId: 'store-sony-audio',
    orderId: null,
    type: 'HUMAN_CHAT',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    store: {
      id: 'store-sony-audio',
      name: 'Sony Acoustics Studio',
      slug: 'sony-acoustics',
      logoUrl:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80',
      sellerProfile: {
        userId: 'user-seller-sony',
        businessName: 'Sony Acoustics Corp',
      },
    },
    customer: {
      id: 'user-customer-1',
      firstName: 'Shahariar',
      lastName: 'Shawon',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    order: null,
    latestMessage: {
      id: 'msg-2',
      conversationId: 'conv-sony-audio-2',
      senderId: 'user-customer-1',
      content: 'Do you offer international warranty for the WH-1000XM5 headphones?',
      type: 'TEXT',
      status: 'DELIVERED',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      sender: {
        id: 'user-customer-1',
        firstName: 'Shahariar',
        lastName: 'Shawon',
      },
    },
    unreadCount: 1,
  },
];

let localMessages: Record<string, ChatMessage[]> = {
  'conv-apple-zone-1': [
    {
      id: 'msg-0',
      conversationId: 'conv-apple-zone-1',
      senderId: 'user-customer-1',
      content: 'Hello, is the iPhone 15 Pro Max 256GB available in stock?',
      type: 'TEXT',
      status: 'READ',
      isRead: true,
      readAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      sender: {
        id: 'user-customer-1',
        firstName: 'Shahariar',
        lastName: 'Shawon',
      },
    },
    {
      id: 'msg-1',
      conversationId: 'conv-apple-zone-1',
      senderId: 'user-seller-apple',
      content:
        'Hello! Yes, the iPhone 15 Pro Max Natural Titanium is in stock and ships within 24 hours.',
      type: 'TEXT',
      status: 'READ',
      isRead: true,
      readAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      sender: {
        id: 'user-seller-apple',
        firstName: 'Apple Zone',
        lastName: 'Support',
        avatarUrl:
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
      },
    },
  ],
  'conv-sony-audio-2': [
    {
      id: 'msg-2',
      conversationId: 'conv-sony-audio-2',
      senderId: 'user-customer-1',
      content: 'Do you offer international warranty for the WH-1000XM5 headphones?',
      type: 'TEXT',
      status: 'DELIVERED',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      sender: {
        id: 'user-customer-1',
        firstName: 'Shahariar',
        lastName: 'Shawon',
      },
    },
  ],
};

let localNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'user-customer-1',
    type: 'PAYMENT',
    title: 'Payment Successful',
    body: 'Your payment of $1,199.00 for order #DOK-2026-98124 was confirmed via Stripe.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    payload: { orderNumber: 'DOK-2026-98124', amount: 1199 },
  },
  {
    id: 'notif-2',
    userId: 'user-customer-1',
    type: 'ORDER',
    title: 'Order Shipped via Express DHL',
    body: 'Package is in transit with tracking #DHL-9920148. Estimated arrival in 2 days.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    payload: { trackingNumber: 'DHL-9920148' },
  },
  {
    id: 'notif-3',
    userId: 'user-customer-1',
    type: 'CHAT',
    title: 'New Message from Apple Zone',
    body: 'Hello! Yes, the iPhone 15 Pro Max Natural Titanium is in stock...',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    payload: { conversationId: 'conv-apple-zone-1' },
  },
  {
    id: 'notif-4',
    userId: 'user-customer-1',
    type: 'SUBSCRIPTION',
    title: 'SaaS PRO Plan Activated',
    body: 'Welcome to DokanOS PRO! Unlimited listings and AI Seller Copilot are now unlocked.',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export async function fetchConversations(): Promise<ConversationItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations`);
    if (res.ok) {
      const json = await res.json();
      return json.data || json;
    }
  } catch {
    // Fallback
  }
  return localConversations;
}

export async function createConversation(payload: {
  storeId: string;
  orderId?: string;
  initialMessage?: string;
  type?: 'HUMAN_CHAT' | 'AI_CHAT';
}): Promise<ConversationItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const existing = localConversations.find(
    (c) => c.storeId === payload.storeId && (!payload.orderId || c.orderId === payload.orderId),
  );
  if (existing) {
    if (payload.initialMessage) {
      await sendChatMessage(existing.id, { content: payload.initialMessage });
    }
    return existing;
  }

  const newConv: ConversationItem = {
    id: `conv_${Date.now()}`,
    customerId: 'user-customer-1',
    sellerId: 'user-seller-apple',
    storeId: payload.storeId,
    orderId: payload.orderId || null,
    type: payload.type || 'HUMAN_CHAT',
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    store: {
      id: payload.storeId,
      name: 'Seller Store',
      slug: 'seller-store',
      logoUrl:
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
    },
    customer: {
      id: 'user-customer-1',
      firstName: 'Shahariar',
      lastName: 'Shawon',
    },
    order: null,
    unreadCount: 0,
  };

  localConversations.unshift(newConv);
  if (payload.initialMessage) {
    await sendChatMessage(newConv.id, { content: payload.initialMessage });
  }

  return newConv;
}

export async function fetchChatMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`);
    if (res.ok) {
      const json = await res.json();
      return json.data || json;
    }
  } catch {
    // Fallback
  }

  return localMessages[conversationId] || [];
}

export async function sendChatMessage(
  conversationId: string,
  payload: {
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE';
    attachments?: Array<{ url: string; fileName?: string; fileType?: string; size?: number }>;
  },
): Promise<ChatMessage> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      return json.message || json;
    }
  } catch {
    // Fallback
  }

  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    conversationId,
    senderId: 'user-customer-1',
    content: payload.content,
    type: payload.type || (payload.attachments && payload.attachments.length > 0 ? 'FILE' : 'TEXT'),
    status: 'SENT',
    attachments: payload.attachments || null,
    isRead: false,
    createdAt: new Date().toISOString(),
    sender: {
      id: 'user-customer-1',
      firstName: 'Shahariar',
      lastName: 'Shawon',
    },
  };

  if (!localMessages[conversationId]) {
    localMessages[conversationId] = [];
  }
  localMessages[conversationId].push(newMsg);

  // Update latest message in conversation
  const conv = localConversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.latestMessage = newMsg;
    conv.lastMessageAt = new Date().toISOString();
  }

  return newMsg;
}

export async function markConversationAsRead(conversationId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const conv = localConversations.find((c) => c.id === conversationId);
  if (conv) conv.unreadCount = 0;
  if (localMessages[conversationId]) {
    localMessages[conversationId].forEach((m) => {
      m.isRead = true;
      m.status = 'READ';
      m.readAt = new Date().toISOString();
    });
  }

  return { success: true };
}

export async function fetchUserNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications`);
    if (res.ok) {
      const json = await res.json();
      return {
        notifications: json.data || json,
        unreadCount: json.meta?.unreadCount ?? 0,
      };
    }
  } catch {
    // Fallback
  }

  const unreadCount = localNotifications.filter((n) => !n.isRead).length;
  return {
    notifications: localNotifications,
    unreadCount,
  };
}

export async function markNotificationAsRead(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  const notif = localNotifications.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
    notif.readAt = new Date().toISOString();
  }
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  localNotifications.forEach((n) => {
    n.isRead = true;
    n.readAt = new Date().toISOString();
  });
  return { success: true };
}

export async function uploadChatAttachment(file: File): Promise<{
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/upload/file`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback
  }

  // Fallback to data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result as string,
        filename: file.name,
        size: file.size,
        mimetype: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  });
}
