import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dokanos.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DokanOS | Intelligent Commerce SaaS & Multi-Vendor Platform',
    template: '%s | DokanOS',
  },
  description:
    'Production-grade AI-powered multi-vendor commerce platform with autonomous catalog optimization, pgvector recommendations, natural language search, and real-time inventory management.',
  keywords: [
    'DokanOS',
    'ecommerce platform',
    'multi-vendor marketplace',
    'AI commerce SaaS',
    'FastAPI LangChain',
    'NestJS ecommerce',
    'pgvector recommendations',
    'Next.js commerce',
  ],
  authors: [{ name: 'DokanOS Engineering Team' }],
  creator: 'DokanOS Architecture',
  publisher: 'DokanOS Platform',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'DokanOS | Intelligent Commerce SaaS & Multi-Vendor Platform',
    description:
      'Autonomous multi-vendor ecommerce platform with natural language search, AI seller sales copilot, and real-time inventory.',
    siteName: 'DokanOS',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'DokanOS Intelligent Commerce Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DokanOS | Intelligent Commerce SaaS',
    description:
      'Next-generation multi-vendor commerce platform with autonomous AI optimization and real-time inventory.',
    creator: '@dokanos_hq',
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: {
    canonical: siteUrl,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'DokanOS',
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      sameAs: ['https://twitter.com/dokanos_hq', 'https://github.com/shahariarshawon/DokanOS'],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'DokanOS Marketplace',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/products?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50/70 text-zinc-900 selection:bg-indigo-600 selection:text-white">
        {/* Accessibility skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none"
        >
          Skip to main content
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
