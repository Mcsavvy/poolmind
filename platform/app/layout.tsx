import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PoolMind - Earn Smarter with Pooled Crypto Arbitrage",
  description: "PoolMind uses blockchain-powered automation to let you invest in crypto arbitrage with zero trading expertise. Built on Stacks blockchain.",
  keywords: ["crypto", "arbitrage", "blockchain", "stacks", "defi", "investment", "pooled trading"],
  authors: [{ name: "PoolMind Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
