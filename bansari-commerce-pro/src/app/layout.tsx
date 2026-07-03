import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Bansari Collections | Wear What Words Cannot Say",
  description:
    "Premium Ethnic Wear | Sarees | Kurta Sets | Lehenga | Gowns | Co-ord Sets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={`${playfair.variable} ${inter.variable} bg-[#FFFDF9] text-[#2F2A28] antialiased`}
      >

        {children}

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
        />

      </body>

    </html>
  );
}