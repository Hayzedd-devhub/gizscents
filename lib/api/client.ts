/* ============================================== */
/*  API Client — axios wrapper with interceptors   */
/* ============================================== */

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { API_BASE_URL } from "@/lib/utils/constants";
import { getGuestId } from "@/lib/utils/guest";

const DEFAULT_CACHE_TTL = 1000 * 60 * 2; // 2 minutes
const cacheStore = new Map<string, { timestamp: number; response: AxiosResponse }>();

export interface CachedRequestConfig extends AxiosRequestConfig {
  cache?: boolean;
  cacheTTL?: number;
}

const getCacheKey = (config: AxiosRequestConfig) => {
  const url = config.baseURL
    ? `${config.baseURL.replace(/\/$/, "")}/${String(config.url).replace(/^\//, "")}`
    : String(config.url || "");

  const params = config.params
    ? JSON.stringify(config.params, Object.keys(config.params).sort())
    : "";
  const data = config.data ? JSON.stringify(config.data) : "";

  return `${config.method}:${url}?${params}|${data}`;
};

/** Routes that require authentication */
export const protectedPaths = ["/account"];

/** Routes that require admin role */
export const adminPaths = ["/admin"];

/** Routes that authenticated users should NOT see */
export const authPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export const isPublicRoute = (path: string) => {
  return ![...protectedPaths, ...adminPaths].some((p) => path.includes(p));
};

const apiClient = axios.create({
  baseURL: typeof window === "undefined" ? `${API_BASE_URL}/api` : "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies (access/refresh tokens)
});

const clearCache = () => cacheStore.clear();

const originalGet = apiClient.get.bind(apiClient);

(apiClient as any).get = async function <T = unknown, R = AxiosResponse<T>>(url: string, config: CachedRequestConfig = {}) {
  if (config.cache === false) {
    return originalGet(url, config) as Promise<R>;
  }

  const cacheKey = getCacheKey({ ...config, url, method: "get" });
  const ttl = config.cacheTTL ?? DEFAULT_CACHE_TTL;
  const cached = cacheStore.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.response as R;
  }

  const response = await originalGet(url, config);
  if (response.status >= 200 && response.status < 300) {
    cacheStore.set(cacheKey, { timestamp: Date.now(), response: response as AxiosResponse });
  }

  return response as R;
};

/** ---------- Request interceptor ---------- */
apiClient.interceptors.request.use((config) => {
  const guestId = getGuestId();
  if (guestId) {
    config.headers["x-guest-id"] = guestId;
  }
  return config;
});

/** ---------- Response interceptor ---------- */
apiClient.interceptors.response.use(
  (response) => {
    if (response.config.method?.toLowerCase() !== "get") {
      clearCache();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet → attempt token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !isPublicRoute(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        // Retry original request with new token
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — redirect to login
        const isAuth = authPaths.find((path) =>
          window.location.pathname.includes(path),
        );
        if (typeof window !== "undefined" && !isAuth) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
