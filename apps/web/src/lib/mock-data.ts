export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  attributes: Record<string, string>;
  images?: string[];
  isDefault?: boolean;
}

export interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  date: string;
  isVerified: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  categorySlug: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  rating: number;
  reviewCount: number;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeRating: number;
  badge?: string;
  primaryImage: string;
  images: string[];
  variants: ProductVariant[];
  attributes: Record<string, string>;
  reviews?: ReviewItem[];
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    title: 'iPhone 15 Pro Titanium',
    slug: 'iphone-15-pro-titanium',
    description:
      'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and a more versatile Pro camera system.',
    price: 999.0,
    compareAtPrice: 1099.0,
    category: 'Smartphones & Tech',
    categorySlug: 'smartphones-tech',
    sku: 'IPH15P-BASE',
    stock: 45,
    lowStockThreshold: 10,
    rating: 4.9,
    reviewCount: 128,
    storeId: 'store-apple',
    storeName: 'Apple Authorized Store',
    storeSlug: 'apple-authorized',
    storeRating: 4.95,
    badge: 'Flagship',
    primaryImage:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      {
        id: 'var-iph-1',
        productId: 'prod-001',
        title: 'Black Titanium / 128GB',
        sku: 'IPH15P-BLK-128',
        price: 999.0,
        compareAtPrice: 1099.0,
        stockQuantity: 18,
        attributes: { color: 'Black Titanium', storage: '128GB' },
        isDefault: true,
      },
      {
        id: 'var-iph-2',
        productId: 'prod-001',
        title: 'Blue Titanium / 256GB',
        sku: 'IPH15P-BLU-256',
        price: 1099.0,
        compareAtPrice: 1199.0,
        stockQuantity: 15,
        attributes: { color: 'Blue Titanium', storage: '256GB' },
      },
      {
        id: 'var-iph-3',
        productId: 'prod-001',
        title: 'White Titanium / 512GB',
        sku: 'IPH15P-WHT-512',
        price: 1299.0,
        compareAtPrice: 1399.0,
        stockQuantity: 12,
        attributes: { color: 'White Titanium', storage: '512GB' },
      },
    ],
    attributes: {
      Chip: 'Apple A17 Pro (3nm)',
      Display: '6.1-inch Super Retina XDR OLED 120Hz',
      Camera: '48MP Main | 12MP Ultra Wide | 12MP 3x Telephoto',
      Connector: 'USB-C (USB 3.0 up to 10Gb/s)',
    },
    reviews: [
      {
        id: 'rev-1',
        userName: 'Alex Montgomery',
        rating: 5,
        title: 'Lightweight titanium feel is incredible',
        comment:
          'Upgraded from the 13 Pro. The weight difference is instantly noticeable and the 3nm thermals are impressive.',
        date: '2026-09-18',
        isVerified: true,
      },
      {
        id: 'rev-2',
        userName: 'Elena Rostova',
        rating: 5,
        title: 'Top notch cameras for mobile photography',
        comment: 'Action button mapped to camera capture makes street photography effortless.',
        date: '2026-09-12',
        isVerified: true,
      },
    ],
  },
  {
    id: 'prod-002',
    title: 'Nike Air Zoom Pegasus 40',
    slug: 'nike-air-zoom-pegasus-40',
    description:
      'A springy ride for any run, the Peg’s familiar, just-for-you feel returns to help you accomplish your goals with improved midfoot lockdown.',
    price: 130.0,
    compareAtPrice: 150.0,
    category: 'Footwear & Apparel',
    categorySlug: 'footwear-apparel',
    sku: 'NIKE-PEG-40',
    stock: 62,
    lowStockThreshold: 8,
    rating: 4.8,
    reviewCount: 94,
    storeId: 'store-nike',
    storeName: 'Fleet Street Athletics',
    storeSlug: 'fleet-street-athletics',
    storeRating: 4.88,
    badge: 'Popular',
    primaryImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      {
        id: 'var-nik-1',
        productId: 'prod-002',
        title: 'Obsidian / US 9.5',
        sku: 'NIKE-PEG-OBS-95',
        price: 130.0,
        stockQuantity: 24,
        attributes: { color: 'Obsidian Black', size: 'US 9.5' },
        isDefault: true,
      },
      {
        id: 'var-nik-2',
        productId: 'prod-002',
        title: 'Pure Platinum / US 10',
        sku: 'NIKE-PEG-PLT-100',
        price: 130.0,
        stockQuantity: 20,
        attributes: { color: 'Pure Platinum', size: 'US 10' },
      },
      {
        id: 'var-nik-3',
        productId: 'prod-002',
        title: 'Crimson Red / US 10.5',
        sku: 'NIKE-PEG-CRM-105',
        price: 135.0,
        stockQuantity: 18,
        attributes: { color: 'Crimson Red', size: 'US 10.5' },
      },
    ],
    attributes: {
      Cushioning: 'Dual Zoom Air Units + React Foam',
      Weight: '288g (Men’s size 10)',
      Drop: '10mm',
      Terrain: 'Road / Pavement',
    },
    reviews: [
      {
        id: 'rev-3',
        userName: 'David Miller',
        rating: 5,
        title: 'My go-to daily trainer',
        comment: 'Logged over 250 miles so far with minimal outsole wear. Great response.',
        date: '2026-09-20',
        isVerified: true,
      },
    ],
  },
  {
    id: 'prod-003',
    title: 'Sony WH-1000XM5 Wireless ANC Headphones',
    slug: 'sony-wh-1000xm5-wireless-anc',
    description:
      'Two processors and eight microphones for unprecedented noise cancellation and magnificent audio clarity with 30-hour battery life.',
    price: 399.0,
    compareAtPrice: 449.0,
    category: 'Audio',
    categorySlug: 'audio',
    sku: 'SONY-WH-XM5',
    stock: 28,
    lowStockThreshold: 5,
    rating: 4.85,
    reviewCount: 76,
    storeId: 'store-audio',
    storeName: 'Acoustic Labs Pro',
    storeSlug: 'acoustic-labs-pro',
    storeRating: 4.92,
    badge: 'Top Audio',
    primaryImage:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      {
        id: 'var-son-1',
        productId: 'prod-003',
        title: 'Midnight Black',
        sku: 'SONY-XM5-BLK',
        price: 399.0,
        stockQuantity: 16,
        attributes: { color: 'Midnight Black' },
        isDefault: true,
      },
      {
        id: 'var-son-2',
        productId: 'prod-003',
        title: 'Silver Mist',
        sku: 'SONY-XM5-SLV',
        price: 399.0,
        stockQuantity: 12,
        attributes: { color: 'Silver Mist' },
      },
    ],
    attributes: {
      Battery: 'Up to 30 hours with ANC enabled',
      Codec: 'LDAC, AAC, SBC, DSEE Extreme',
      Weight: '250 grams',
      Bluetooth: 'v5.2 Multi-point pairing',
    },
    reviews: [
      {
        id: 'rev-4',
        userName: 'Samantha Wu',
        rating: 5,
        title: 'Silence on long haul flights',
        comment: 'Completely muted jet engine roar on a 14 hour flight. Ear cushions are plush.',
        date: '2026-09-14',
        isVerified: true,
      },
    ],
  },
  {
    id: 'prod-004',
    title: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
    slug: 'keychron-q1-pro-wireless-keyboard',
    description:
      'CNC machined aluminum frame, double-gasket design, screw-in stabilizers, and wireless Bluetooth 5.1 with QMK/VIA keymap flexibility.',
    price: 199.0,
    compareAtPrice: 219.0,
    category: 'Computer Peripherals',
    categorySlug: 'computer-peripherals',
    sku: 'KEY-Q1P-ALU',
    stock: 35,
    lowStockThreshold: 6,
    rating: 4.75,
    reviewCount: 52,
    storeId: 'store-mech',
    storeName: 'MechCraft Foundry',
    storeSlug: 'mechcraft-foundry',
    storeRating: 4.84,
    badge: 'Custom Gear',
    primaryImage:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      {
        id: 'var-key-1',
        productId: 'prod-004',
        title: 'Carbon Black / Red Linear',
        sku: 'KEY-Q1P-BLK-RED',
        price: 199.0,
        stockQuantity: 15,
        attributes: { color: 'Carbon Black', switches: 'K Pro Red (Linear)' },
        isDefault: true,
      },
      {
        id: 'var-key-2',
        productId: 'prod-004',
        title: 'Silver Grey / Brown Tactile',
        sku: 'KEY-Q1P-GRY-BRN',
        price: 199.0,
        stockQuantity: 12,
        attributes: { color: 'Silver Grey', switches: 'K Pro Brown (Tactile)' },
      },
      {
        id: 'var-key-3',
        productId: 'prod-004',
        title: 'Shell White / Banana Tactile',
        sku: 'KEY-Q1P-WHT-BAN',
        price: 209.0,
        stockQuantity: 8,
        attributes: { color: 'Shell White', switches: 'K Pro Banana (Early Tactile)' },
      },
    ],
    attributes: {
      Layout: '75% Compact (81 Keys)',
      Connectivity: 'Bluetooth 5.1 & Type-C Wired',
      Keycaps: 'KSA Profile Double-Shot PBT',
      HotSwappable: 'Yes (3-pin & 5-pin compatible)',
    },
  },
  {
    id: 'prod-005',
    title: 'MacBook Pro 16" M3 Max Studio',
    slug: 'macbook-pro-16-m3-max',
    description:
      'Apple M3 Max chip with 16-core CPU and 40-core GPU, Liquid Retina XDR display, up to 22 hours of battery life for demanding engineering workflows.',
    price: 3499.0,
    compareAtPrice: 3799.0,
    category: 'Smartphones & Tech',
    categorySlug: 'smartphones-tech',
    sku: 'MBP16-M3MAX',
    stock: 14,
    lowStockThreshold: 4,
    rating: 4.95,
    reviewCount: 43,
    storeId: 'store-apple',
    storeName: 'Apple Authorized Store',
    storeSlug: 'apple-authorized',
    storeRating: 4.95,
    badge: 'Pro Tier',
    primaryImage:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      {
        id: 'var-mbp-1',
        productId: 'prod-005',
        title: 'Space Black / 36GB / 1TB',
        sku: 'MBP16-SB-36-1TB',
        price: 3499.0,
        stockQuantity: 8,
        attributes: { color: 'Space Black', memory: '36GB', storage: '1TB SSD' },
        isDefault: true,
      },
      {
        id: 'var-mbp-2',
        productId: 'prod-005',
        title: 'Silver / 48GB / 2TB',
        sku: 'MBP16-SLV-48-2TB',
        price: 3999.0,
        stockQuantity: 6,
        attributes: { color: 'Silver', memory: '48GB', storage: '2TB SSD' },
      },
    ],
    attributes: {
      Display: '16.2-inch Liquid Retina XDR (3456x2234)',
      Ports: '3x Thunderbolt 4, HDMI, SDXC, MagSafe 3',
      Audio: 'Six-speaker sound system with force-cancelling woofers',
    },
  },
  {
    id: 'prod-006',
    title: 'Herman Miller Embody Ergonomic Work Chair',
    slug: 'herman-miller-embody-chair',
    description:
      'Engineered with a pixelated matrix that automatically conforms to your body’s micro-movements, encouraging healthy posture and natural circulation.',
    price: 1695.0,
    compareAtPrice: 1845.0,
    category: 'Home & Ergonomics',
    categorySlug: 'home-ergonomics',
    sku: 'HM-EMBODY-CHAIR',
    stock: 9,
    lowStockThreshold: 3,
    rating: 4.9,
    reviewCount: 38,
    storeId: 'store-ergo',
    storeName: 'Workspace Elite Direct',
    storeSlug: 'workspace-elite',
    storeRating: 4.89,
    badge: 'Ergonomic Choice',
    primaryImage:
      'https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      {
        id: 'var-hm-1',
        productId: 'prod-006',
        title: 'Graphite Frame / Black Rhythm Fabric',
        sku: 'HM-EMB-GRP-BLK',
        price: 1695.0,
        stockQuantity: 5,
        attributes: { frame: 'Graphite', fabric: 'Black Rhythm' },
        isDefault: true,
      },
      {
        id: 'var-hm-2',
        productId: 'prod-006',
        title: 'Titanium Frame / Mineral Sync Fabric',
        sku: 'HM-EMB-TIT-MIN',
        price: 1795.0,
        stockQuantity: 4,
        attributes: { frame: 'Titanium', fabric: 'Mineral Sync' },
      },
    ],
    attributes: {
      Warranty: '12-Year Official Herman Miller Warranty',
      Adjustments: 'BackFit, Tilt Limiter, Seat Depth, Arm Height & Width',
      Assembly: 'Fully Assembled in Box',
    },
  },
];

export const CATEGORIES = [
  { name: 'All Categories', slug: 'all', count: 6 },
  { name: 'Smartphones & Tech', slug: 'smartphones-tech', count: 2 },
  { name: 'Footwear & Apparel', slug: 'footwear-apparel', count: 1 },
  { name: 'Audio', slug: 'audio', count: 1 },
  { name: 'Computer Peripherals', slug: 'computer-peripherals', count: 1 },
  { name: 'Home & Ergonomics', slug: 'home-ergonomics', count: 1 },
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

export interface StoreTheme {
  id?: string;
  storeId?: string;
  primaryColor: string;
  secondaryColor: string;
  layoutType: 'MODERN' | 'MINIMAL' | 'BOLD' | 'ELEGANT';
  fontStyle: 'INTER' | 'ROBOTO' | 'OUTFIT' | 'PLAYFAIR';
  customCss?: string;
}

export interface StoreSection {
  id?: string;
  sectionType:
    'HERO_BANNER' | 'FEATURED_PRODUCTS' | 'NEW_ARRIVALS' | 'BEST_SELLERS' | 'ABOUT' | 'CONTACT';
  title?: string;
  subtitle?: string;
  content?: Record<string, any>;
  sortOrder: number;
  isVisible: boolean;
}

export interface StoreReviewItem {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
}

export interface StoreDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  businessCategory: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    website?: string;
    facebook?: string;
  };
  rating: number;
  reviewCount: number;
  followerCount: number;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  theme: StoreTheme;
  sections: StoreSection[];
  storeReviews?: StoreReviewItem[];
}

export const MOCK_STORES: Record<string, StoreDetails> = {
  'apple-authorized': {
    id: 'store-apple',
    name: 'Apple Authorized Store',
    slug: 'apple-authorized',
    description:
      'Official authorized vendor for genuine Apple products, iPhones, MacBooks, and accessories backed by AppleCare.',
    logoUrl:
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&auto=format&fit=crop&q=80',
    businessCategory: 'Consumer Electronics & Hardware',
    contactEmail: 'contact@apple-authorized.dokanos.dev',
    contactPhone: '+1 (800) 692-7753',
    socialLinks: {
      twitter: 'https://x.com/apple',
      website: 'https://apple.com',
      instagram: 'https://instagram.com/apple',
    },
    rating: 4.95,
    reviewCount: 166,
    followerCount: 2480,
    status: 'ACTIVE',
    theme: {
      primaryColor: '#4F46E5',
      secondaryColor: '#0F172A',
      layoutType: 'MODERN',
      fontStyle: 'INTER',
    },
    sections: [
      {
        sectionType: 'HERO_BANNER',
        title: 'Innovations Engineered for Professionals',
        subtitle:
          'Experience the titanium precision of iPhone 15 Pro and the extreme performance of M3 Max.',
        content: { ctaText: 'Shop Flagship Devices', ctaUrl: '#products' },
        sortOrder: 1,
        isVisible: true,
      },
      {
        sectionType: 'FEATURED_PRODUCTS',
        title: 'Featured Devices',
        subtitle: 'Our top-rated products with verified factory warranties.',
        content: { limit: 4 },
        sortOrder: 2,
        isVisible: true,
      },
      {
        sectionType: 'ABOUT',
        title: 'Authorized Excellence',
        subtitle:
          'Every device sold through Apple Authorized Store undergoes 100-point diagnostic checks.',
        content: {},
        sortOrder: 3,
        isVisible: true,
      },
      {
        sectionType: 'CONTACT',
        title: 'Direct Support',
        subtitle: 'Need help choosing the right specs? Our certified specialists are online 24/7.',
        content: {},
        sortOrder: 4,
        isVisible: true,
      },
    ],
    storeReviews: [
      {
        id: 'srev-1',
        userName: 'Jonathan Brand',
        rating: 5,
        title: 'Fast dispatch and immaculate packaging',
        comment: 'Received my Space Black MacBook within 24 hours. Sealed in original factory box.',
        createdAt: '2026-09-22',
      },
      {
        id: 'srev-2',
        userName: 'Sophia Chen',
        rating: 5,
        title: 'Genuine serial number verified',
        comment: 'Verified the AppleCare warranty immediately upon unboxing. Exceptional service.',
        createdAt: '2026-09-19',
      },
    ],
  },
  'fleet-street-athletics': {
    id: 'store-nike',
    name: 'Fleet Street Athletics',
    slug: 'fleet-street-athletics',
    description: 'Performance footwear, marathon running shoes, and technical athletic apparel.',
    logoUrl:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=1600&auto=format&fit=crop&q=80',
    businessCategory: 'Athletic Footwear & Apparel',
    contactEmail: 'support@fleetathletics.dokanos.dev',
    contactPhone: '+1 (555) 832-1920',
    socialLinks: {
      instagram: 'https://instagram.com/fleetathletics',
    },
    rating: 4.88,
    reviewCount: 94,
    followerCount: 1120,
    status: 'ACTIVE',
    theme: {
      primaryColor: '#10B981',
      secondaryColor: '#064E3B',
      layoutType: 'BOLD',
      fontStyle: 'OUTFIT',
    },
    sections: [
      {
        sectionType: 'HERO_BANNER',
        title: 'Engineered For Distance',
        subtitle: 'Push your daily limits with Zoom Air responsiveness.',
        content: { ctaText: 'Browse Athletic Shoes' },
        sortOrder: 1,
        isVisible: true,
      },
      {
        sectionType: 'FEATURED_PRODUCTS',
        title: 'Top Trainers',
        subtitle: 'Bestselling road and trail running shoes.',
        content: { limit: 4 },
        sortOrder: 2,
        isVisible: true,
      },
    ],
  },
};
