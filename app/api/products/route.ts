import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Category from "@/lib/db/models/Category";
import { escapeRegex } from "@/lib/utils/helpers";

/**
 * Lightweight public product search — powers the storefront navbar's live
 * suggestions dropdown. Uses a substring regex (not the $text index) so
 * partial words typed mid-search still match as the user types.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "6", 10) || 6,
      10,
    );

    if (!search) {
      return NextResponse.json({ success: true, data: [] });
    }

    const regex = new RegExp(escapeRegex(search), "i");

    // `category` is a reference, not a text field on Product, so also pull in
    // products whose category name matches (e.g. "laptop" -> "Laptops"
    // category) — otherwise this dropdown can say "not found" for a term the
    // full results page finds via the same category match.
    const matchingCategories = await Category.find({ name: regex })
      .select("_id")
      .lean();
    const categoryIds = matchingCategories.map((c) => c._id);

    const products = await Product.find({
      status: "active",
      $or: [
        { name: regex },
        { sku: regex },
        { tags: regex },
        ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
      ],
    })
      .select("name slug price discountPrice images stock")
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("Product search error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
