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
        url: '/og-image.jpg',
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
    images: ['/og-image.jpg'],
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
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
  logo: 'https://www.bansaricollection.in/logo.png',
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
