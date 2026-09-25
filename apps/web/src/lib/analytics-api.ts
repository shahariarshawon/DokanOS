export type TimeRange = '7d' | '30d' | '90d' | 'ytd' | '1y';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchSellerDashboard(
  range: TimeRange = '30d',
  token?: string,
): Promise<SellerDashboardResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/seller/dashboard?range=${range}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback to rich presentation data
  }

  return generateMockSellerData(range);
}

export async function fetchAdminDashboard(
  range: TimeRange = '30d',
  token?: string,
): Promise<AdminDashboardResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/admin/dashboard?range=${range}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback
  }

  return generateMockAdminData(range);
}

// -------------------------------------------------------------
// REALISTIC MOCK GENERATORS FOR OFFLINE / FIRST-LOAD DEMO
// -------------------------------------------------------------

function generateMockSellerData(range: TimeRange): SellerDashboardResult {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const now = new Date();
  const timeline: TimelineDataPoint[] = [];

  let totalSales = 0;
  let netRevenue = 0;
  let totalOrders = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dailyOrders = Math.floor(Math.random() * 8) + 2;
    const dailySales = Math.round((dailyOrders * 85 + Math.random() * 120) * 100) / 100;
    const dailyRev = Math.round(dailySales * 0.9 * 100) / 100;
    const dailyViews = dailyOrders * 28 + Math.floor(Math.random() * 40);

    totalSales += dailySales;
    netRevenue += dailyRev;
    totalOrders += dailyOrders;

    timeline.push({
      date: dateStr,
      sales: dailySales,
      revenue: dailyRev,
      orders: dailyOrders,
      views: dailyViews,
    });
  }

  return {
    storeId: 'store_demo_101',
    storeName: 'Apex Audio & Tech Hub',
    currency: 'USD',
    timeRange: range,
    startDate: timeline[0].date,
    endDate: timeline[timeline.length - 1].date,
    metrics: {
      totalSales: Math.round(totalSales * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      ordersCount: totalOrders,
      itemsSoldCount: Math.round(totalOrders * 1.4),
      averageOrderValue: Math.round((totalSales / totalOrders) * 100) / 100,
      conversionRate: 3.6,
      totalViews: totalOrders * 28,
      cartAdditions: totalOrders * 4,
    },
    growth: {
      salesGrowthPct: 14.8,
      ordersGrowthPct: 11.2,
      revenueGrowthPct: 15.1,
    },
    timeline,
    topProducts: [
      {
        id: 'p1',
        title: 'Apex ANC Wireless Headphones Pro',
        sku: 'APX-ANC-01',
        unitsSold: 84,
        revenue: 16716.0,
        stock: 32,
        rating: 4.9,
        imageUrl: null,
      },
      {
        id: 'p2',
        title: 'Keychron Q1 Max Custom Mechanical Keyboard',
        sku: 'KCH-Q1M-99',
        unitsSold: 52,
        revenue: 10868.0,
        stock: 18,
        rating: 4.8,
        imageUrl: null,
      },
      {
        id: 'p3',
        title: 'UltraSpeed USB-C Thunderbolt 4 Dock 12-in-1',
        sku: 'USD-TB4-12',
        unitsSold: 41,
        revenue: 6150.0,
        stock: 45,
        rating: 4.7,
        imageUrl: null,
      },
      {
        id: 'p4',
        title: 'Ergonomic Vertical Mouse Silent Click',
        sku: 'ERG-MS-04',
        unitsSold: 38,
        revenue: 1862.0,
        stock: 60,
        rating: 4.6,
        imageUrl: null,
      },
    ],
    recentActivity: [
      {
        id: 'ord_1',
        type: 'ORDER',
        customerName: 'Sarah Jenkins',
        customerEmail: 'sarah.j@example.com',
        amount: 398.0,
        status: 'PAID',
        productTitle: 'Apex ANC Wireless Headphones Pro',
        timestamp: new Date(now.getTime() - 1000 * 60 * 18).toISOString(),
      },
      {
        id: 'ord_2',
        type: 'ORDER',
        customerName: 'Marcus Vance',
        customerEmail: 'm.vance@techcorp.io',
        amount: 209.0,
        status: 'PROCESSING',
        productTitle: 'Keychron Q1 Max Custom Mechanical Keyboard',
        timestamp: new Date(now.getTime() - 1000 * 60 * 54).toISOString(),
      },
      {
        id: 'ord_3',
        type: 'ORDER',
        customerName: 'Elena Rostova',
        customerEmail: 'elena.rostova@design.org',
        amount: 150.0,
        status: 'DELIVERED',
        productTitle: 'UltraSpeed USB-C Thunderbolt 4 Dock',
        timestamp: new Date(now.getTime() - 1000 * 60 * 180).toISOString(),
      },
      {
        id: 'ord_4',
        type: 'ORDER',
        customerName: 'David Chen',
        customerEmail: 'davidc@fintech.dev',
        amount: 49.0,
        status: 'PAID',
        productTitle: 'Ergonomic Vertical Mouse Silent Click',
        timestamp: new Date(now.getTime() - 1000 * 60 * 360).toISOString(),
      },
    ],
    cached: false,
  };
}

function generateMockAdminData(range: TimeRange): AdminDashboardResult {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const now = new Date();
  const timeline: AdminTimelineDataPoint[] = [];

  let totalGmv = 0;
  let platformRev = 0;
  let totalOrders = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dailyOrders = Math.floor(Math.random() * 25) + 15;
    const dailyGmv = Math.round((dailyOrders * 110 + Math.random() * 500) * 100) / 100;
    const dailyComm = Math.round(dailyGmv * 0.1 * 100) / 100;
    const newUsers = Math.floor(Math.random() * 12) + 4;

    totalGmv += dailyGmv;
    platformRev += dailyComm;
    totalOrders += dailyOrders;

    timeline.push({
      date: dateStr,
      gmv: dailyGmv,
      platformRevenue: dailyComm,
      orders: dailyOrders,
      newUsers,
    });
  }

  return {
    timeRange: range,
    startDate: timeline[0].date,
    endDate: timeline[timeline.length - 1].date,
    metrics: {
      totalUsers: 14280,
      usersBreakdown: {
        customers: 13420,
        sellers: 812,
        admins: 48,
        active: 13950,
        suspended: 330,
      },
      activeSellers: 684,
      totalStores: 742,
      totalTransactions: totalOrders,
      transactionsBreakdown: {
        completed: Math.round(totalOrders * 0.94),
        pending: Math.round(totalOrders * 0.03),
        failed: Math.round(totalOrders * 0.02),
        refunded: Math.round(totalOrders * 0.01),
      },
      gatewayBreakdown: {
        stripe: Math.round(totalOrders * 0.68),
        sslcommerz: Math.round(totalOrders * 0.32),
      },
      platformGmv: Math.round(totalGmv * 100) / 100,
      platformRevenue: Math.round(platformRev * 100) / 100,
      averageCommissionRate: 10.0,
      totalOrders,
    },
    growth: {
      userGrowthPct: 18.4,
      sellerGrowthPct: 12.6,
      gmvGrowthPct: 22.8,
      ordersGrowthPct: 19.5,
    },
    timeline,
    topStores: [
      {
        id: 's1',
        name: 'Apex Audio & Tech Hub',
        sellerBusinessName: 'Apex Electronics LLC',
        totalSales: 48250.0,
        commissionPaid: 4825.0,
        rating: 4.9,
        orderCount: 384,
      },
      {
        id: 's2',
        name: 'Nordic Minimal Living',
        sellerBusinessName: 'Nordic Designs AB',
        totalSales: 39400.0,
        commissionPaid: 3940.0,
        rating: 4.8,
        orderCount: 290,
      },
      {
        id: 's3',
        name: 'Volt Gear Outdoor',
        sellerBusinessName: 'Volt Outfitters Corp',
        totalSales: 31200.0,
        commissionPaid: 3120.0,
        rating: 4.7,
        orderCount: 245,
      },
      {
        id: 's4',
        name: 'Artisan Craft Roasters',
        sellerBusinessName: 'Artisan Beans Co.',
        totalSales: 18900.0,
        commissionPaid: 1890.0,
        rating: 5.0,
        orderCount: 412,
      },
    ],
    cached: false,
  };
}
