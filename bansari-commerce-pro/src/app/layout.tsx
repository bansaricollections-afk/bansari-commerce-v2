import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * ASSET STATUS (as of 2026-07-16):
 * - /favicon.svg          ✅ EXISTS  — used for all icon slots below
 * - /site.webmanifest    ✅ EXISTS
 * - /favicon.ico          ❌ MISSING — generate before launch (see DEPLOY_CHECKLIST.md)
 * - /favicon-16x16.png   ❌ MISSING — generate before launch
 * - /apple-touch-icon.png❌ MISSING — generate before launch
 * - /og-image.jpg        ❌ MISSING — generate before launch; SVG placeholder active
 *
 * The icon fields below use /favicon.svg for every slot so that
 * Next.js does NOT serve 404 responses for missing binary assets on
 * every page load. Replace each entry with the correct path once the
 * binary files are placed in /public.
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bansaricollection.in'
  ),
  title: {
    default: 'Bansari Collections — Indian Ethnic Wear',
    template: '%s | Bansari Collections',
  },
  description:
    'Discover premium Indian ethnic wear — sarees, lehengas, salwar suits and more. Handpicked collections crafted for every occasion.',
  keywords: [
    'Indian ethnic wear',
    'sarees',
    'lehengas',
    'salwar suits',
    'kurtas',
    'Bansari Collections',
    'Indian fashion',
    'online Indian clothes',
  ],
  authors: [{ name: 'Bansari Collections' }],
  creator: 'Bansari Collections',
  publisher: 'Bansari Collections',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.bansaricollection.in',
    siteName: 'Bansari Collections',
    title: 'Bansari Collections — Indian Ethnic Wear',
    description:
      'Discover premium Indian ethnic wear — sarees, lehengas, salwar suits and more.',
    images: [
      {
        // TODO: replace with /og-image.jpg (1200x630) once generated
        // See DEPLOY_CHECKLIST.md — Step 2
        url: '/og-image-placeholder.svg',
        width: 1200,
        height: 630,
        alt: 'Bansari Collections — Indian Ethnic Wear',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bansari Collections — Indian Ethnic Wear',
    description:
      'Discover premium Indian ethnic wear — sarees, lehengas, salwar suits and more.',
    // TODO: replace with /og-image.jpg once generated — see DEPLOY_CHECKLIST.md
    images: ['/og-image-placeholder.svg'],
    creator: '@bansaricollections',
  },
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
  icons: {
    // Using SVG favicon for all slots until binary assets are generated.
    // SVG favicons are supported in all modern browsers.
    // TODO: replace with /favicon.ico, /favicon-16x16.png, /apple-touch-icon.png
    // once generated — see DEPLOY_CHECKLIST.md Steps 3–5.
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://www.bansaricollection.in',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bansari Collections',
  url: 'https://www.bansaricollection.in',
  logo: 'https://www.bansaricollection.in/favicon.svg',
  description: 'Premium Indian ethnic wear — sarees, lehengas, salwar suits.',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-84601-92745',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
  sameAs: [
    'https://www.instagram.com/bansaricollections',
    'https://www.facebook.com/bansaricollections',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Bansari Collections',
  url: 'https://www.bansaricollection.in',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate:
        'https://www.bansaricollection.in/shop?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
