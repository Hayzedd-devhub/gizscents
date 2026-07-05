import type { MetadataRoute } from "next";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import { API_BASE_URL } from "@/lib/utils/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${API_BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${API_BASE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${API_BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    await dbConnect();
    const products = await Product.find({ status: "active" })
      .select("slug updatedAt")
      .lean();

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${API_BASE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    console.error("Error building sitemap:", error);
    return staticRoutes;
  }
}
