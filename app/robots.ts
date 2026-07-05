import type { MetadataRoute } from "next";
import { API_BASE_URL } from "@/lib/utils/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/api"],
    },
    sitemap: `${API_BASE_URL}/sitemap.xml`,
  };
}
