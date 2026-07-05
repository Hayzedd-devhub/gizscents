import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import getStoreSettings from "@/lib/settings.server";

// Providers are composed via the `Providers` component imported below

import "./globals.css";
// Script import removed; theme initialization handled in ThemeProvider
import { Providers } from "@/components/providers";
import { getCurrentHost } from "@/lib/store/utils";
import { API_BASE_URL } from "@/lib/utils/constants";
import { truncate } from "@/lib/utils/helpers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const DEFAULT_DESCRIPTION =
  "Discover quality products at great prices. Shop our curated collection with fast delivery and secure payments.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const storeName = settings?.storeName || "Store";
  const title = settings?.seoMeta?.metaTitle || `${storeName} — Shop the Best Deals`;
  const description = truncate(
    settings?.seoMeta?.metaDescription || settings?.description || DEFAULT_DESCRIPTION,
    160,
  );
  const ogImage = settings?.seoMeta?.ogImage || settings?.logo?.url;

  return {
    metadataBase: new URL(API_BASE_URL),
    title: {
      default: title,
      template: `%s | ${storeName}`,
    },
    description,
    keywords: ["ecommerce", "shop", "online store", "buy", "deals", storeName],
    icons: settings?.favicon ? { icon: settings.favicon } : undefined,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_NG",
      siteName: storeName,
      title,
      description,
      url: "/",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // we'll implement host based routing later
  const host = await getCurrentHost();
  const initialSettings = await getStoreSettings();
  console.log("🌐 Rendering Providers with host:", host);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head></head>
      <body className="min-h-full flex flex-col antialiased">
        <Providers initialSettings={initialSettings}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--surface)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
                boxShadow: "var(--shadow-elevated)",
              },
              success: {
                iconTheme: {
                  primary: "oklch(0.6 0.18 145)",
                  secondary: "white",
                },
              },
              error: {
                iconTheme: {
                  primary: "oklch(0.58 0.22 25)",
                  secondary: "white",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
