import React from "react";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import ProductVariant from "@/lib/db/models/ProductVariant";
import ProductDetailInteractive from "./ProductDetailInteractive";
import Link from "next/link";
import getStoreSettings from "@/lib/settings.server";
import { truncate } from "@/lib/utils/helpers";
import { API_BASE_URL } from "@/lib/utils/constants";

interface DetailPageProps {
  params: Promise<{ slug: string }>;
}

// Wrapped in React's cache() so generateMetadata() and the page component
// share one DB fetch per request instead of querying twice.
const getProductBySlug = cache(async (slug: string) => {
  try {
    await dbConnect();
    const product = await Product.findOne({ slug, status: "active" }).lean();
    if (product) {
      const variants = await ProductVariant.find({
        productId: product._id,
        isActive: true,
      }).lean();
      return {
        ...JSON.parse(JSON.stringify(product)),
        variants: JSON.parse(JSON.stringify(variants)),
      };
    }
  } catch (error) {
    console.error("Error fetching product detail page by slug:", error);
  }

  // Fallback to mock item if DB doesn't have it yet
  return null;
});

export async function generateMetadata({
  params,
}: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = product.seoMeta?.metaTitle || product.name;
  const description = truncate(
    product.seoMeta?.metaDescription ||
      product.shortDescription ||
      product.description ||
      `Buy ${product.name} online.`,
    160,
  );
  const image = product.seoMeta?.ogImage || product.images?.[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/products/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: DetailPageProps) {
  const resolvedParams = await params;
  const product = await getProductBySlug(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  const settings = await getStoreSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: (product.images || []).map((img: { url: string }) => img.url),
    sku: product.sku,
    offers: {
      "@type": "Offer",
      price: product.discountPrice || product.price,
      priceCurrency: settings?.currency || "NGN",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${API_BASE_URL}/products/${product.slug}`,
    },
    ...(product.avgRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.avgRating,
            reviewCount: product.reviewCount || 0,
          },
        }
      : {}),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Link href="/" className="hover:text-foreground cursor-pointer">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground cursor-pointer">
          Products
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-xs">
          {product.name}
        </span>
      </div>

      {/* Main Interactive Details Wrapper */}
      <ProductDetailInteractive
        product={product}
        variants={product.variants || []}
      />

      {/* Technical Specifications */}
      {product.specifications &&
        Object.keys(product.specifications).length > 0 && (
          <section className="border-t border-border pt-10 space-y-6">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              Product Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-secondary border border-border p-6 rounded-2xl">
              {Object.entries(product.specifications).map(([key, val]) => (
                <div
                  key={key}
                  className="flex justify-between py-2 border-b border-border/40 last:border-b-0 text-sm"
                >
                  <span className="font-semibold text-muted-foreground">
                    {key}
                  </span>
                  <span className="font-bold text-foreground text-right">
                    {val as string}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}
