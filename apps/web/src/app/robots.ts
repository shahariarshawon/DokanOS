import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dokanos.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/inbox', '/checkout', '/orders/confirmation'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
