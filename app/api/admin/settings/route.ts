import { NextRequest, NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/requireAdmin";
import dbConnect from "@/lib/db/connect";
import { StoreSettings } from "@/lib/db/models";
import getStoreSettings from "@/lib/settings.server";
import { getCurrencySymbol } from "@/currencies";

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const guard = await adminGuard(req);
    if (guard) return guard;
    const body = await req.json();
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = new StoreSettings({
        ...(await getStoreSettings()), // creates default if not exists
      });
    }
    if (body?.currency) {
      body.currencySymbol = getCurrencySymbol(body.currency);
      console.log({
        body,
        getCurrencySymbol: getCurrencySymbol(body.currency),
      });
    }

    // Merge allowed fields only
    const allowed = [
      "storeName",
      "logo",
      "favicon",
      "description",
      "address",
      "phone",
      "email",
      "socialLinks",
      "businessHours",
      "seoMeta",
      "themeColors",
      "deliveryZones",
      "pickupEnabled",
      "deliveryEnabled",
      "pickupAddress",
      "categoryView",
      "currency",
      "currencySymbol",
      "checkoutMethod",
      "personalAccount",
      "paymentSettings",
      "notificationPreferences",
      "heroContent",
      "heroSlides",
      "aboutUs",
    ];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k))
        (settings as any)[k] = (body as any)[k];
    }
    await settings.save();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("Admin settings update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
