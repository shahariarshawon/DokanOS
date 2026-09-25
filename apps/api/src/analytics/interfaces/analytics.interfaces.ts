export interface SellerMetrics {
  totalSales: number;
  netRevenue: number;
  ordersCount: number;
  itemsSoldCount: number;
  averageOrderValue: number;
  conversionRate: number;
  totalViews: number;
  cartAdditions: number;
}

export interface SellerGrowth {
  salesGrowthPct: number;
  ordersGrowthPct: number;
  revenueGrowthPct: number;
}

export interface TimelineDataPoint {
  date: string;
  sales: number;
  revenue: number;
  orders: number;
  views: number;
}

export interface TopProductItem {
  id: string;
  title: string;
  sku: string | null;
  unitsSold: number;
  revenue: number;
  stock: number;
  rating: number;
  imageUrl: string | null;
}

export interface CustomerActivityItem {
  id: string;
  type: 'ORDER' | 'VIEW' | 'CART';
  customerName: string;
  customerEmail: string | null;
  amount: number | null;
  status: string | null;
  productTitle?: string;
  timestamp: string;
}

export interface SellerDashboardResult {
  storeId: string;
  storeName: string;
  currency: string;
  timeRange: string;
  startDate: string;
  endDate: string;
  metrics: SellerMetrics;
  growth: SellerGrowth;
  timeline: TimelineDataPoint[];
  topProducts: TopProductItem[];
  recentActivity: CustomerActivityItem[];
  cached: boolean;
}

export interface AdminMetrics {
  totalUsers: number;
  usersBreakdown: {
    customers: number;
    sellers: number;
    admins: number;
    active: number;
    suspended: number;
  };
  activeSellers: number;
  totalStores: number;
  totalTransactions: number;
  transactionsBreakdown: {
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  gatewayBreakdown: {
    stripe: number;
    sslcommerz: number;
  };
  platformGmv: number;
  platformRevenue: number;
  averageCommissionRate: number;
  totalOrders: number;
}

export interface AdminGrowth {
  userGrowthPct: number;
  sellerGrowthPct: number;
  gmvGrowthPct: number;
  ordersGrowthPct: number;
}

export interface AdminTimelineDataPoint {
  date: string;
  gmv: number;
  platformRevenue: number;
  orders: number;
  newUsers: number;
}

export interface TopStoreItem {
  id: string;
  name: string;
  sellerBusinessName: string;
  totalSales: number;
  commissionPaid: number;
  rating: number;
  orderCount: number;
}

export interface AdminDashboardResult {
  timeRange: string;
  startDate: string;
  endDate: string;
  metrics: AdminMetrics;
  growth: AdminGrowth;
  timeline: AdminTimelineDataPoint[];
  topStores: TopStoreItem[];
  cached: boolean;
}

export interface ProductPerformanceItem {
  id: string;
  title: string;
  sku: string | null;
  category: string | null;
  price: number;
  stock: number;
  views: number;
  orders: number;
  unitsSold: number;
  revenue: number;
  conversionRate: number;
  inventoryStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface ProductAnalyticsResult {
  storeId: string;
  timeRange: string;
  topSelling: ProductPerformanceItem[];
  lowPerforming: ProductPerformanceItem[];
  outOfStock: ProductPerformanceItem[];
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    unitsSold: number;
  }>;
  totalViews: number;
  averageConversionRate: number;
  cached: boolean;
}

export interface CustomerSegmentItem {
  id: string;
  name: string;
  email: string | null;
  ordersCount: number;
  totalSpent: number;
  averageOrderValue: number;
  segment: 'NEW' | 'REGULAR' | 'HIGH_VALUE';
  firstOrderDate: string;
  lastOrderDate: string;
}

export interface CustomerAnalyticsResult {
  storeId: string;
  timeRange: string;
  totalCustomers: number;
  newCustomersCount: number;
  returningCustomersCount: number;
  returningRatePct: number;
  averageLifetimeValue: number;
  averagePurchaseFrequency: number;
  segments: {
    newCount: number;
    regularCount: number;
    highValueCount: number;
  };
  topCustomers: CustomerSegmentItem[];
  cached: boolean;
}

export interface InsightItem {
  id: string;
  storeId: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  metric: string | null;
  changeRate: number | null;
  metadata?: any;
  isDismissed: boolean;
  createdAt: string;
  updatedAt: string;
}
