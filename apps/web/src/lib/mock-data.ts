export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  rating: number;
  storeName: string;
  badge?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    title: 'MacBook Pro 16" M3 Max (36GB, 1TB SSD)',
    slug: 'macbook-pro-16-m3-max',
    description:
      'Apple M3 Max chip with 14-core CPU and 30-core GPU, 36GB Unified Memory, Liquid Retina XDR display.',
    price: 3499.0,
    category: 'Laptops & Tech',
    stock: 14,
    rating: 4.9,
    storeName: 'TechVibe Official',
    badge: 'Best Seller',
  },
  {
    id: 'prod-002',
    title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    slug: 'sony-wh-1000xm5-headphones',
    description:
      'Industry-leading noise cancellation with 8 microphones and Auto NC Optimizer. Up to 30 hours battery.',
    price: 398.0,
    category: 'Audio',
    stock: 25,
    rating: 4.8,
    storeName: 'Acoustic Labs',
    badge: 'Popular',
  },
  {
    id: 'prod-003',
    title: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
    slug: 'keychron-q1-pro-keyboard',
    description:
      'Full aluminum CNC body, hot-swappable switches, QMK/VIA programmable with wireless Bluetooth 5.1.',
    price: 199.0,
    category: 'Accessories',
    stock: 42,
    rating: 4.7,
    storeName: 'MechCraft Store',
  },
  {
    id: 'prod-004',
    title: 'Dell UltraSharp 38" Curved USB-C Hub Monitor (U3824DW)',
    slug: 'dell-ultrasharp-38-curved-monitor',
    description:
      'WQHD+ IPS Black panel with 2000:1 contrast ratio, built-in 2.5GbE RJ45 ethernet, and 90W power delivery.',
    price: 1199.0,
    category: 'Laptops & Tech',
    stock: 6,
    rating: 4.9,
    storeName: 'VisualTech Display',
    badge: 'Top Rated',
  },
  {
    id: 'prod-005',
    title: 'Herman Miller Embody Ergonomic Work Chair',
    slug: 'herman-miller-embody-chair',
    description:
      'Engineered with pixelated support, fully adjustable arms, breathable rhythm fabric and posture fit.',
    price: 1595.0,
    category: 'Home Office',
    stock: 8,
    rating: 4.9,
    storeName: 'Workspace Elite',
  },
  {
    id: 'prod-006',
    title: 'Anker Prime 100W GaN Fast Wall Charger (3-Port)',
    slug: 'anker-prime-100w-gan-charger',
    description:
      'Ultra-compact multi-device fast charger with ActiveShield 2.0 temperature monitoring safety.',
    price: 59.99,
    category: 'Accessories',
    stock: 75,
    rating: 4.8,
    storeName: 'PowerVolt Gear',
  },
];

export const DEMO_USERS = {
  buyer: {
    email: 'buyer@dokanos.dev',
    password: 'Password123!',
    name: 'Sarah Connor',
    role: 'CUSTOMER',
  },
  seller: {
    email: 'seller@dokanos.dev',
    password: 'Password123!',
    name: 'Marcus Tech Store',
    role: 'SELLER',
  },
  admin: {
    email: 'admin@dokanos.dev',
    password: 'Password123!',
    name: 'Platform Administrator',
    role: 'ADMIN',
  },
};
