const API = "/api";

let currencySymbol = "RM";
let businessName = "FNB";

export function getCurrencySymbol(): string {
  return currencySymbol;
}

export function getBusinessName(): string {
  return businessName;
}

export function formatPrice(amount: number): string {
  return `${currencySymbol}${amount.toFixed(2)}`;
}

export const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800",
  confirmed: "#2196F3",
  preparing: "#9C27B0",
  ready: "#4CAF50",
  paid: "#607D8B",
  cancelled: "#f44336",
};

export function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem("admin_token", t);
  else localStorage.removeItem("admin_token");
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    setToken(null);
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const auth = {
  login: (username: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};

export interface Order {
  id: number;
  order_id: string;
  user_id: number;
  table_number: number;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface SalesDataPoint {
  date: string;
  total: number;
  count: number;
}

export interface HourlyDataPoint {
  hour: number;
  items_sold: number;
  total: number;
  unpaid_total: number;
}

export interface TodayStats {
  total_orders: number;
  total_sales: number;
  users_today: number;
  unpaid_total: number;
}

export interface ItemPieDataPoint {
  name: string;
  count: number;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  per_page: number;
}

type EventCallback = (data: any) => void;

export function subscribeToEvents(onEvent: EventCallback): () => void {
  const es = new EventSource("/api/events");
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)); } catch { /* ignore */ }
  };
  es.onerror = () => {};
  return () => es.close();
}

export const settings = {
  get: async (): Promise<Record<string, string>> => {
    const data = await request("/settings");
    if (data.currency_symbol) currencySymbol = data.currency_symbol;
    if (data.business_name) businessName = data.business_name;
    return data;
  },
  init: async () => {
    try {
      const data = await settings.get();
      if (data.business_name) businessName = data.business_name;
    } catch (e) { console.warn("settings init failed", e); }
  },
};

export const admin = {
  sales: {
    daily: (days = 7): Promise<SalesDataPoint[]> => request(`/admin/sales?days=${days}`),
    hourly: (days = 7): Promise<HourlyDataPoint[]> => request(`/admin/sales/hourly?days=${days}`),
    hourlyToday: (): Promise<HourlyDataPoint[]> => request("/admin/sales/hourly-today"),
    itemToday: (): Promise<ItemPieDataPoint[]> => request("/admin/sales/item-today"),
  },
  stats: {
    today: (): Promise<TodayStats> => request("/admin/stats/today"),
  },
  seed: () => request("/admin/seed", { method: "POST" }),

  orders: {
    list: (startDate?: string, endDate?: string, page?: number, perPage?: number): Promise<PaginatedOrders> => {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (page) params.set("page", String(page));
      if (perPage) params.set("per_page", String(perPage));
      const qs = params.toString();
      return request(`/admin/orders${qs ? `?${qs}` : ""}`);
    },
    get: (id: number): Promise<Order> => request(`/admin/orders/${id}`),
    updateStatus: (id: number, status: string) =>
      request(`/admin/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    updateItem: (orderId: number, itemId: number, quantity: number): Promise<Order> =>
      request(`/admin/orders/${orderId}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      }),
    deleteItem: (orderId: number, itemId: number): Promise<Order> =>
      request(`/admin/orders/${orderId}/items/${itemId}`, { method: "DELETE" }),
  },

  menu: {
    list: (): Promise<MenuItem[]> => request("/admin/menu"),
    create: (data: Partial<MenuItem>) =>
      request("/admin/menu", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<MenuItem>) =>
      request(`/admin/menu/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/admin/menu/${id}`, { method: "DELETE" }),
  },

  categories: {
    list: (): Promise<Category[]> => request("/admin/categories"),
    create: (name: string, sort_order: number) =>
      request("/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name, sort_order }),
      }),
    update: (id: number, name: string, sort_order: number) =>
      request(`/admin/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, sort_order }),
      }),
    delete: (id: number) =>
      request(`/admin/categories/${id}`, { method: "DELETE" }),
  },

  users: {
    list: (): Promise<User[]> => request("/admin/users"),
    create: (username: string, password: string, name: string, role: string) =>
      request("/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, password, name, role }),
      }),
    update: (id: number, data: { username?: string; name?: string; password?: string; role?: string }) =>
      request(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  settings: {
    update: (key: string, value: string) =>
      request("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key, value }),
      }),
  },
};
