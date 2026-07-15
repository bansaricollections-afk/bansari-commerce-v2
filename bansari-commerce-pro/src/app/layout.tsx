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
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bansaricollections.com'
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
    url: 'https://bansaricollections.com',
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
    canonical: 'https://bansaricollections.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Bansari Collections',
              url: 'https://bansaricollections.com',
              logo: 'https://bansaricollections.com/logo.png',
              description:
                'Premium Indian ethnic wear — sarees, lehengas, salwar suits.',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                availableLanguage: ['English', 'Hindi'],
              },
              sameAs: [
                'https://www.instagram.com/bansaricollections',
                'https://www.facebook.com/bansaricollections',
              ],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Skip to content — accessibility */}
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
