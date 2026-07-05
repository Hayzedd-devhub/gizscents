import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RefreshCw,
  HelpCircle,
  Star,
  Sparkles,
} from "lucide-react";

import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Category from "@/lib/db/models/Category";
import ProductCard from "@/components/storefront/ProductCard";
import Image from "next/image";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { ICategory, IProduct } from "@/lib/types";
import getStoreSettings from "@/lib/settings.server";
import { HeroSlider } from "@/components/storefront/HeroSlider";
import { truncate } from "@/lib/utils/helpers";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const storeName = settings?.storeName || "Store";
  const title = settings?.heroContent?.title || `${storeName} — Shop the Best Deals`;
  const description = truncate(
    settings?.heroContent?.subtitle ||
      settings?.description ||
      "Shop curated collections with fast delivery and secure payments.",
    160,
  );
  const ogImage =
    settings?.heroSlides?.[0]?.image?.url ||
    settings?.seoMeta?.ogImage ||
    settings?.logo?.url;

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
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
  };
}

async function getHomeData() {
  try {
    await dbConnect();

    // Attempt database retrieval
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1 })
      .limit(6)
      .lean();

    const products = await Product.aggregate([
      { $match: { status: "active" } },
      { $sort: { createdAt: -1, isFeatured: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
    ]);

    const settings = await getStoreSettings();
    console.log({
      categories: JSON.parse(JSON.stringify(categories)) as ICategory[],
      products: JSON.parse(JSON.stringify(products)) as IProduct[],
      settings,
    });

    return {
      categories: JSON.parse(JSON.stringify(categories)) as ICategory[],
      products: JSON.parse(JSON.stringify(products)) as IProduct[],
      settings,
    };
  } catch (error) {
    console.error("DB Fetching error on Home page:", error);
    return {
      categories: [],
      products: [],
      settings: null,
    };
  }
}

export default async function HomePage() {
  const { categories, products, settings } = await getHomeData();

  const heroTitle =
    settings?.heroContent?.title || "Elevate Your Shopping Experience";
  const heroSubtitle =
    settings?.heroContent?.subtitle ||
    "Discover top quality curated electronics, fashion apparel, and home essentials. Experience fast delivery and seamless checkout today.";
  const heroButtonText =
    settings?.heroContent?.buttonText || "Shop Collections";
  const heroButtonLink = settings?.heroContent?.buttonLink || "/products";
  const showAboutUsPage = settings?.aboutUs?.showAboutUsPage || false;
  return (
    <div className="space-y-16 pb-16">
      {/* Premium Hero Section */}
      <section className="relative bg-surface-secondary border-b border-border py-10 lg:py-28 overflow-hidden">
        {/* Gradients */}
        <div className="absolute top-0 right-0 w-[45%] h-[90%] rounded-full bg-primary-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[45%] h-[90%] rounded-full bg-accent-500/10 blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            {/* <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 text-primary-600 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              New Season Collections
            </span> */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              {heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link
                href={heroButtonLink}
                className="px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center gap-1.5 shadow-soft hover:shadow-card hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                {heroButtonText}
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              {showAboutUsPage && (
                <Link
                  href="/about"
                  className="px-6 py-3 rounded-full bg-surface border border-border hover:bg-surface-secondary text-foreground font-semibold hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  About Us
                </Link>
              )}
            </div>
          </div>

          {/* Hero Banner Slider / Showcase card */}
          <div className="relative mx-auto lg:mr-0 w-full">
            {settings?.heroSlides && settings.heroSlides.length > 0 ? (
              <HeroSlider slides={settings.heroSlides} />
            ) : (
              <div className="relative mx-auto lg:mr-0 w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-overlay border border-border/80 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&auto=format&fit=crop&q=80"
                  alt="Hero collection"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to from-black/60 via-black/10 to-transparent flex flex-col justify-end p-8 text-white">
                  <span className="text-xs uppercase font-bold tracking-widest text-primary-400">
                    Exclusive Deals
                  </span>
                  <h3 className="text-xl font-bold mt-1">
                    Up to 40% Off New Items
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categories Grid */}

      <CategoryGrid categories={categories} />

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Featured Products
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Handpicked premium items with incredible value
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
          >
            Explore all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((prod: any) => (
            <ProductCard key={prod._id} product={prod} />
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-surface-secondary border border-border rounded-2xl p-8 shadow-soft">
          <div className="flex items-start gap-4">
            <Truck className="h-6 w-6 text-primary-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground text-sm">
                Swift Delivery
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prompt shipping to major zones in Nigeria.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-primary-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground text-sm">
                Secure Checkout
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Secured card & account transfers.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <RefreshCw className="h-6 w-6 text-primary-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground text-sm">
                Easy Returns
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                3-day return policy for peace of mind.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <HelpCircle className="h-6 w-6 text-primary-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground text-sm">
                24/7 Assistance
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dedicated WhatsApp & email hotline.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
