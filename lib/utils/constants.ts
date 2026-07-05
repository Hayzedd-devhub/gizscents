/* ============================================== */
/*  Application constants                          */
/* ============================================== */

/** Default pagination */
export const DEFAULT_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 20;

/** JWT configuration */
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY! || "6m";
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY! || "1y";

/** Cookie names */
export const COOKIE_ACCESS_TOKEN = "access_token";
export const COOKIE_REFRESH_TOKEN = "refresh_token";

/** Product limits */
export const MAX_PRODUCT_IMAGES = 10;
export const MAX_IMAGE_SIZE_MB = 5;

/** Order statuses */
export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

/** Payment providers */
export const PAYMENT_PROVIDERS = ["monnify", "paystack", "opay"] as const;

/**
 * Notification delivery methods admins can enable per event (e.g. new order).
 * `available: false` methods are shown in settings as "coming soon" until wired up.
 */
export const NOTIFICATION_METHODS = [
  { value: "email", label: "Email", available: true },
  { value: "whatsapp", label: "WhatsApp", available: false },
] as const;

/** Review limits */
export const MAX_REVIEW_RATING = 5;
export const MIN_REVIEW_RATING = 1;

/** Sort options for product listing */
export const PRODUCT_SORT_OPTIONS = [
  { label: "Newest", value: "createdAt", order: "desc" as const },
  { label: "Price: Low to High", value: "price", order: "asc" as const },
  { label: "Price: High to Low", value: "price", order: "desc" as const },
  { label: "Rating", value: "avgRating", order: "desc" as const },
  { label: "Name: A-Z", value: "name", order: "asc" as const },
  { label: "Name: Z-A", value: "name", order: "desc" as const },
  { label: "Best Selling", value: "salesCount", order: "desc" as const },
] as const;

/** Variant types */
export const VARIANT_TYPES = ["color", "size", "material"] as const;

/** Notification types */
export const NOTIFICATION_TYPES = [
  "order_new",
  "order_status",
  "payment_success",
  "payment_failed",
  "low_stock",
  "review_new",
  "general",
] as const;

/** Recently viewed - max items to store */
export const MAX_RECENTLY_VIEWED = 12;

/** API base URL */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const PAYMENT_CALLBACK_URL = `${API_BASE_URL}/checkout`;

/** Rate limiting */
export const RATE_LIMIT = {
  auth: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 req / 15 min
  api: { windowMs: 60 * 1000, max: 100 }, // 100 req / min
  upload: { windowMs: 60 * 1000, max: 20 }, // 20 req / min
};

export const CheckoutMethod = ["online" , "pay_on_delivery" , "bank_transfer" , "whatsapp"];
