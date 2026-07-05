"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import apiClient, { type CachedRequestConfig } from "@/lib/api/client";
import { debounce } from "@/lib/utils/helpers";
import { useStoreSettings } from "@/components/providers/SettingsProvider";

interface SuggestedProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images?: { url: string }[];
}

interface SearchBarProps {
  className?: string;
  inputClassName?: string;
  onNavigate?: () => void;
}

export default function SearchBar({
  className,
  inputClassName,
  onNavigate,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatMoney } = useStoreSettings();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestedProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-fill from the URL when landing directly on /products?search=... —
  // adjusted during render (guarded by a comparison) rather than in an
  // effect, since this is deriving state from a prop change, not
  // synchronizing with an external system.
  const syncKey = `${pathname}|${searchParams.toString()}`;
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    setQuery(pathname === "/products" ? searchParams.get("search") || "" : "");
  }

  const fetchSuggestions = useRef(
    debounce((term: unknown) => {
      const value = term as string;
      apiClient
        .get("/products", {
          params: { search: value, limit: 6 },
          cache: false,
        } as CachedRequestConfig)
        .then((res) => setResults(res.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 350),
  ).current;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      setIsOpen(true);
      setIsLoading(true);
      fetchSuggestions(value.trim());
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToResults = (term: string) => {
    setIsOpen(false);
    router.push(`/products?search=${encodeURIComponent(term)}`);
    onNavigate?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) goToResults(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    if (pathname === "/products" && searchParams.get("search")) {
      router.push("/products");
    }
  };

  const trimmed = query.trim();

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          placeholder="Search products, categories..."
          value={query}
          onChange={handleChange}
          onFocus={() => trimmed && setIsOpen(true)}
          className={
            inputClassName ||
            "w-full bg-surface-secondary text-foreground text-sm pl-10 pr-9 py-2 rounded-full border border-border focus:border-primary-500 focus:outline-none transition-colors"
          }
        />
        <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        {trimmed && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-soft overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              <ul>
                {results.map((product) => (
                  <li key={product._id}>
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-surface-secondary shrink-0">
                        {product.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(product.discountPrice || product.price)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => goToResults(trimmed)}
                className="w-full text-center text-xs font-bold uppercase tracking-widest text-primary-500 py-3 border-t border-border hover:bg-surface-secondary transition-colors"
              >
                See all results for &ldquo;{trimmed}&rdquo;
              </button>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No products found for &ldquo;{trimmed}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
