"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";

import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { useStoreSettings } from "@/components/providers/SettingsProvider";
import { clearUser } from "@/lib/store/slices/authSlice";
import { toggleCartDrawer } from "@/lib/store/slices/uiSlice";
import { fetchAdminNotificationCount } from "@/lib/store/slices/notificationSlice";
import apiClient from "@/lib/api/client";
import { toast } from "react-hot-toast";
import { useTheme } from "next-themes";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { items } = useAppSelector((state) => state.cart);
  const { items: wishlistItems } = useAppSelector((state) => state.wishlist);
  const { unreadCount } = useAppSelector((state) => state.notifications);
  const { storeName } = useStoreSettings();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const isAdmin =
    isAuthenticated && user && (user.role === "admin" || user.role === "staff");

  const showSearch = pathname === "/" || pathname === "/products";

  React.useEffect(() => {
    if (isAdmin) {
      dispatch(fetchAdminNotificationCount());
      // Optional: Polling every 60 seconds
      const interval = setInterval(() => {
        dispatch(fetchAdminNotificationCount());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [dispatch, isAdmin]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      dispatch(clearUser());
      toast.success("Successfully logged out");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent group-hover:opacity-85 transition-opacity">
              {storeName ?? "STOREFRONT"}
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          {showSearch && (
            <SearchBar className="hidden md:block flex-1 max-w-md" />
          )}

          {/* Navigation Actions */}
          <nav className="hidden md:flex items-center gap-4 text-foreground">
            {/* Admin link for admin/staff */}
            {isAdmin && (
              <Link
                href="/admin"
                className="p-2 rounded-full hover:bg-surface-secondary text-muted-foreground hover:text-foreground transition-all duration-200 relative"
                title="Admin Dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
                {unreadCount.orders > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-error-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-scale-in">
                    {unreadCount.orders}
                  </span>
                )}
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-surface-secondary text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
              title="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-warning-500" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              className="p-2 rounded-full hover:bg-surface-secondary text-muted-foreground hover:text-foreground relative transition-all duration-200"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-scale-in">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => dispatch(toggleCartDrawer())}
              className="p-2 rounded-full hover:bg-surface-secondary text-muted-foreground hover:text-foreground relative transition-all duration-200 cursor-pointer"
              title="Shopping Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile / Login */}
            {isAuthenticated ? (
              <div className="relative group flex items-center">
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-surface-secondary transition-all"
                >
                  <div className="h-7 w-7 rounded-full bg-primary-500/20 text-primary-600 flex items-center justify-center font-bold text-xs uppercase">
                    {user?.name?.[0] || "U"}
                  </div>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-all shadow-soft active:scale-95"
              >
                <User className="h-4 w-4" />
                Login
              </Link>
            )}
          </nav>

          {/* Mobile Header Buttons */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-surface-secondary text-muted-foreground"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-warning-500" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={() => dispatch(toggleCartDrawer())}
              className="p-2 rounded-full hover:bg-surface-secondary text-muted-foreground relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary-500 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full hover:bg-surface-secondary text-foreground"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search - Visible only on / and /products */}
        {showSearch && (
          <div className="md:hidden pb-3">
            <SearchBar
              className="w-full"
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile Drawer menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass border-b border-border p-4 space-y-4 animate-slide-down">
          {/* Links list */}
          <div className="flex flex-col gap-2 font-medium">
            <Link
              href="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2 rounded-lg hover:bg-surface-secondary text-foreground"
            >
              Browse Products
            </Link>
            <Link
              href="/account/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2 rounded-lg hover:bg-surface-secondary text-foreground flex items-center justify-between"
            >
              Wishlist
              {wishlistCount > 0 && (
                <span className="bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-2 rounded-lg hover:bg-surface-secondary text-foreground flex items-center justify-between"
                  >
                    Admin Dashboard
                    {unreadCount.orders > 0 && (
                      <span className="bg-error-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {unreadCount.orders}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-lg hover:bg-surface-secondary text-foreground"
                >
                  My Account
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-error-50 text-error-500 flex items-center gap-1.5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mx-4 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-center font-bold"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
