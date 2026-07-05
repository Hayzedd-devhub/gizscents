import React from "react";
import type { Metadata } from "next";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Category from "@/lib/db/models/Category";
import ProductCard from "@/components/storefront/ProductCard";
import Link from "next/link";
import { escapeRegex } from "@/lib/utils/helpers";
import getStoreSettings from "@/lib/settings.server";

// Mock Fallback Products
const MOCK_PRODUCTS = [
  {
    _id: "prod1",
    name: "Acoustic Noise Cancelling Wireless Headphones",
    slug: "wireless-headphones",
    price: 45000,
    discountPrice: 38000,
    images: [
      {
        url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
      },
    ],
    avgRating: 4.8,
    reviewCount: 24,
    stock: 12,
  },
  {
    _id: "prod2",
    name: "Classic Chronograph Wristwatch",
    slug: "classic-wristwatch",
    price: 65000,
    images: [
      {
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
      },
    ],
    avgRating: 4.6,
    reviewCount: 15,
    stock: 4,
  },
  {
    _id: "prod3",
    name: "Ergonomic Office Chair with Lumbar Support",
    slug: "ergonomic-office-chair",
    price: 95000,
    discountPrice: 80000,
    images: [
      {
        url: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500&auto=format&fit=crop&q=60",
      },
    ],
    avgRating: 4.7,
    reviewCount: 30,
    stock: 8,
  },
  {
    _id: "prod4",
    name: "Smart Fitness Watch Tracker",
    slug: "smart-fitness-tracker",
    price: 25000,
    images: [
      {
        url: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&auto=format&fit=crop&q=60",
      },
    ],
    avgRating: 4.4,
    reviewCount: 9,
    stock: 10,
  },
];

interface ListingPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ListingPageProps): Promise<Metadata> {
  const params = await searchParams;
  const settings = await getStoreSettings();
  const storeName = settings?.storeName || "Store";

  let title = "Shop All Products";
  if (params.search) {
    title = `Search results for "${params.search}"`;
  } else if (params.category) {
    try {
      await dbConnect();
      const category = await Category.findOne({ slug: params.category })
        .select("name")
        .lean();
      if (category) title = category.name;
    } catch {
      // fall back to default title
    }
  }

  const description = `Browse ${title.toLowerCase()} at ${storeName}. Quality products, fast delivery, secure checkout.`;

  return {
    title,
    description,
    alternates: { canonical: "/products" },
    // Parameterized search-result pages are thin/duplicate content — keep them out of the index.
    robots: params.search ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: "/products" },
    twitter: { card: "summary", title, description },
  };
}

async function getProductsData(
  search?: string,
  categorySlug?: string,
  sort?: string,
) {
  try {
    await dbConnect();

    // Build DB Query
    const baseQuery: Record<string, any> = { status: "active" };

    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        baseQuery.category = category._id;
      }
    }

    // Build Sorting — default to relevance when searching, unless an explicit sort was chosen
    let sortOptions: Record<string, any> = search
      ? { score: { $meta: "textScore" } }
      : { createdAt: -1 };
    if (sort === "price_asc") {
      sortOptions = { price: 1 };
    } else if (sort === "price_desc") {
      sortOptions = { price: -1 };
    } else if (sort === "rating") {
      sortOptions = { avgRating: -1 };
    } else if (sort === "latest") {
      sortOptions = { createdAt: -1 };
    }

    const pipeline: Record<string, any>[] = [];

    if (search) {
      // `category` is a reference, not a text field, so the $text index never
      // matches a query like "laptop" against a "Laptops" category. Resolve
      // categories whose name matches the term and union their products in
      // alongside the direct text matches (skip this when already scoped to
      // one category — matching category names wouldn't be meaningful there).
      let categoryIds: any[] = [];
      if (!baseQuery.category) {
        const matchingCategories = await Category.find({
          name: { $regex: escapeRegex(search), $options: "i" },
        })
          .select("_id")
          .lean();
        categoryIds = matchingCategories.map((c) => c._id);
      }

      pipeline.push(
        { $match: { ...baseQuery, $text: { $search: search } } },
        { $addFields: { score: { $meta: "textScore" } } },
      );

      if (categoryIds.length) {
        pipeline.push({
          $unionWith: {
            coll: "products",
            pipeline: [
              { $match: { ...baseQuery, category: { $in: categoryIds } } },
              { $addFields: { score: 0 } },
            ],
          },
        });
      }

      // Sort by score before de-duping so a product matched by both branches
      // keeps its real text-relevance score instead of the category branch's 0.
      pipeline.push(
        { $sort: { score: -1 } },
        { $group: { _id: "$_id", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
      );
    } else {
      pipeline.push({ $match: baseQuery });
    }

    pipeline.push(
      { $sort: sortOptions },
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
    );

    const products = await Product.aggregate(pipeline as any);

    const categories = await Category.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    return {
      products: JSON.parse(JSON.stringify(products)),
      categories: JSON.parse(JSON.stringify(categories)),
    };
  } catch (error) {
    console.error("Error loading products list:", error);
    return {
      products: MOCK_PRODUCTS,
      categories: [],
    };
  }
}

import { Filter, SlidersHorizontal, ChevronRight, Search } from "lucide-react";

export default async function ProductsListingPage({
  searchParams,
}: ListingPageProps) {
  // Await async searchParams in Next 16
  const params = await searchParams;
  const { products, categories } = await getProductsData(
    params.search,
    params.category,
    params.sort,
  );

  const currentCategory = categories.find(
    (c: any) => c.slug === params.category,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          <Link href="/" className="hover:text-primary-500 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Shop</span>
          {currentCategory && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{currentCategory.name}</span>
            </>
          )}
        </div>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground">
          {currentCategory
            ? currentCategory.name
            : params.search
              ? `Results for "${params.search}"`
              : "Our Collection"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore {products.length} handpicked premium products
        </p>
      </div>

      {/* Mobile Categories - Horizontal Scroll */}
      <div className="lg:hidden w-[93vw] overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 select-none">
          <Link
            href="/products"
            className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border flex-shrink-0 ${
              !params.category
                ? "bg-primary-500 border-primary-500 text-white shadow-soft"
                : "bg-surface border-border text-muted-foreground"
            }`}
          >
            All Items
          </Link>
          {categories.map((cat: any) => (
            <Link
              key={cat._id}
              href={`/products?category=${cat.slug}${params.sort ? `&sort=${params.sort}` : ""}`}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border flex-shrink-0 ${
                params.category === cat.slug
                  ? "bg-primary-500 border-primary-500 text-white shadow-soft"
                  : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24">
          <div className="bg-surface-secondary border border-border p-6 rounded-2xl space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Filter className="h-4 w-4 text-primary-500" />
              <h3 className="font-bold text-sm uppercase tracking-widest">
                Filters
              </h3>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Categories
              </h4>
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/products"
                  className={`text-sm py-2 px-3 rounded-xl font-semibold transition-all ${
                    !params.category
                      ? "bg-primary-500 text-white shadow-soft"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  }`}
                >
                  All Categories
                </Link>
                {categories.map((cat: any) => (
                  <Link
                    key={cat._id}
                    href={`/products?category=${cat.slug}${params.sort ? `&sort=${params.sort}` : ""}`}
                    className={`text-sm py-2 px-3 rounded-xl font-semibold transition-all ${
                      params.category === cat.slug
                        ? "bg-primary-500 text-white shadow-soft"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 pl-4 pr-2 bg-surface-secondary border border-border rounded-2xl">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Sort By:
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { label: "Latest", value: "latest" },
                { label: "Price: Low to High", value: "price_asc" },
                { label: "Price: High to Low", value: "price_desc" },
                { label: "Top Rated", value: "rating" },
              ].map((opt) => (
                <Link
                  key={opt.value}
                  href={`/products?${params.category ? `category=${params.category}&` : ""}${params.search ? `search=${params.search}&` : ""}sort=${opt.value}`}
                  className={`whitespace-nowrap text-[10px] font-black uppercase tracking-tighter px-4 py-2 rounded-xl border transition-all ${
                    params.sort === opt.value ||
                    (!params.sort && opt.value === "latest")
                      ? "bg-foreground text-background border-foreground shadow-soft"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 bg-surface-secondary rounded-3xl border border-dashed border-border text-center">
              <div className="h-16 w-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                No Products Found
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                We couldn't find any items matching your current filters. Try
                relaxing your search or choosing a different category.
              </p>
              <Link
                href="/products"
                className="mt-6 text-primary-500 font-bold uppercase text-xs tracking-widest hover:underline"
              >
                Clear all filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
              {products.map((product: any) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
