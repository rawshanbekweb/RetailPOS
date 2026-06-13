import { useAuthStore } from "../store/authStore";

const BASE = "/api/v1";

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true
): Promise<T> {
  const { accessToken, refreshToken, setAuth, setAccessToken, logout } = useAuthStore.getState();

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && refreshToken) {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (r.ok) {
      const data = await r.json();
      setAccessToken(data.access_token);
      return request<T>(method, path, body, false);
    } else {
      logout();
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)              => request<T>("GET",  path),
  post:   <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put:    <T>(path: string, body: unknown) => request<T>("PUT",  path, body),
  delete: <T>(path: string)              => request<T>("DELETE", path),
};

// Auth
export const authApi = {
  register: (data: { store_name: string; email: string; password: string; store_timezone?: string; store_currency?: string }) =>
    api.post<{ access_token: string; refresh_token: string; user: { id: string; email: string; role: string }; store: { id: string; name: string; currency: string; timezone: string; tax_rate: string } }>("/register", data),

  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string; user: { id: string; email: string; role: string }; store: { id: string; name: string; currency: string; timezone: string; tax_rate: string } }>("/auth/login", { email, password }),
};

// Products
export const productsApi = {
  list:   (updatedAfter?: string) => api.get<{ products: RemoteProduct[]; synced_at: string }>(`/products${updatedAfter ? `?updated_after=${encodeURIComponent(updatedAfter)}` : ""}`),
  create: (data: Partial<RemoteProduct>) => api.post<{ product: RemoteProduct }>("/products", data),
  update: (id: string, data: Partial<RemoteProduct>) => api.put<{ product: RemoteProduct }>(`/products/${id}`, data),
};

export interface RemoteProduct {
  id: string; store_id: string; sku: string; name: string;
  price: string; stock_quantity: number; low_stock_threshold: number;
  is_active: boolean; updated_at: string; created_at: string;
}

// Sales
export const salesApi = {
  list:  ()      => api.get<{ sales: RemoteSale[] }>("/sales"),
  batch: (sales: BatchSalePayload[]) => api.post<{ results: BatchResult[] }>("/sales/batch", { sales }),
};

export interface RemoteSale {
  id: string; store_id: string; cashier_id: string;
  total_amount: string; payment_method: string; status: string;
  client_created_at: string; created_at: string;
}

export interface BatchSalePayload {
  sale_id: string; cashier_id: string;
  items: { product_id: string; product_name: string; product_sku: string; unit_price: number; quantity: number; discount_amount: number; line_total: number }[];
  subtotal: number; discount_total: number; total_amount: number;
  payment_method: string; client_created_at: string;
}

export interface BatchResult {
  sale_id: string; status: "accepted" | "already_processed" | "failed"; error?: string;
}

// Store
export const storeApi = {
  get:    () => api.get<{ id: string; name: string; currency: string; timezone: string; tax_rate: string }>("/store"),
  update: (data: Partial<{ name: string; timezone: string; currency: string; tax_rate: number; address: string; phone: string }>) =>
    api.put<{ id: string; name: string; currency: string; timezone: string; tax_rate: string }>("/store", data),
};

// Users
export const usersApi = {
  list:   () => api.get<{ users: RemoteUser[] }>("/users"),
  create: (data: { email: string; password: string; role?: string }) => api.post<{ user: RemoteUser }>("/users", data),
};

export interface RemoteUser {
  id: string; email: string; role: string; is_active: boolean; created_at: string;
}

// Analytics
export const analyticsApi = {
  get: () => api.get<AnalyticsData>("/analytics"),
};

export interface AnalyticsData {
  today:        { sale_count: number; revenue: string; avg_transaction: string };
  last_7_days:  { sale_count: number; revenue: string; avg_transaction: string };
  last_30_days: { sale_count: number; revenue: string; avg_transaction: string };
  daily:        { day: string; sale_count: number; revenue: string }[];
  top_products: { product_name: string; product_sku: string; units_sold: number; revenue: string }[];
}
