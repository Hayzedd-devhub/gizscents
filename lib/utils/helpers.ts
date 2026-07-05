/* ============================================== */
/*  Utility helpers                                */
/* ============================================== */

import { clsx, type ClassValue } from "clsx";
import { OrderStatus, PaymentStatus } from "../types";

export const orderStatusColors: Record<OrderStatus, string> = {
  draft: "bg-info-50 text-info-600 border-info-100",
  awaiting_confirmation: "bg-warning-50 text-warning-600 border-warning-100",
  processing: "bg-primary-50 text-primary-600 border-primary-100",
  in_progress: "bg-accent-50 text-accent-600 border-accent-100",
  ready_for_pickup: "bg-slate-50 text-slate-600 border-slate-100",
  delivered: "bg-success-50 text-success-600 border-success-100",
  cancelled: "bg-error-50 text-error-600 border-error-100",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: "Draft",
  awaiting_confirmation: "Awaiting Confirmation",
  processing: "Processing",
  in_progress: "In Progress",
  ready_for_pickup: "Ready for Pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const orderStatusOptions: { label: string; value: OrderStatus }[] = [
  { label: "Awaiting confirmation", value: "awaiting_confirmation" },
  { label: "Processing", value: "processing" },
  { label: "In progress", value: "in_progress" },
  { label: "Ready for Pickup", value: "ready_for_pickup" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export const paymentStatusColors: Record<PaymentStatus, string> = {
  initialized: "bg-info-50 text-info-600 border-info-100",
  pending: "bg-warning-50 text-warning-600 border-warning-100",
  paid: "bg-success-50 text-success-600 border-success-100",
  failed: "bg-error-50 text-error-600 border-error-100",
  expired: "bg-error-50 text-error-600 border-error-100",
  reversed: "bg-error-50 text-error-600 border-error-100",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  initialized: "Initialized",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  reversed: "Reversed",
};

/**
 * Merge Tailwind classes with clsx.
 * Use instead of raw clsx to handle conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Generate a URL-friendly slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Generate a unique order number.
 * Format: ORD-YYYYMMDD-XXXXX
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${dateStr}-${random}`;
}

/**
 * Sleep utility for delays.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text to a maximum length.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Extract initials from a name (e.g., "John Doe" → "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Escape regex special characters so user input can be safely used inside `new RegExp()`.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a value is a valid MongoDB ObjectId string.
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Build query string from params object (filters out undefined/null).
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

/**
 * Calculate discount percentage.
 */
export function calcDiscountPercent(
  original: number,
  discounted: number,
): number {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

/**
 * Debounce a function call.
 *
 * @template T - The type of the function to debounce.
 * @param {T} fn - The function to debounce.
 * @param {number} delay - The delay in milliseconds to wait before calling the function.
 * @returns {(...args: Parameters<T>) => void} The debounced function.
 *
 * @example
 * const debouncedFetchProducts = debounce(fetchProducts, 500);
 * debouncedFetchProducts();
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
