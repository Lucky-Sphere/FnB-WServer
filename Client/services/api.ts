import EventSource from "react-native-sse";

const API_URL = "http://192.168.68.133:20080/api";

let currencySymbol = "RM";

export function getCurrencySymbol(): string {
  return currencySymbol;
}

export function formatPrice(amount: number): string {
  return `${currencySymbol}${amount.toFixed(2)}`;
}

export const settings = {
  fetch: async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.currency_symbol) currencySymbol = data.currency_symbol;
      }
    } catch (e) { console.warn("failed to fetch settings", e); }
  },
};

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
}

export interface OrderItem {
  menu_item_id: number;
  quantity: number;
  table_number?: number;
}

export interface Order {
  id: number;
  order_id: string;
  user_id: number;
  table_number: number;
  status: string;
  total_amount: number;
  created_at: string;
  items?: OrderItemDetail[];
}

export interface OrderItemDetail {
  id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

export function getToken(): string | null {
  return token;
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const auth = {
  register: (username: string, password: string, name: string) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, name }),
    }),
  login: (username: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};

export const menu = {
  list: () => request("/menu"),
  get: (id: number) => request(`/menu/${id}`),
};

export const categories = {
  list: () => request("/categories"),
};

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  per_page: number;
}

export const orders = {
  create: (items: OrderItem[], tableNumber: number = 0) =>
    request("/orders", {
      method: "POST",
      body: JSON.stringify({ items, table_number: tableNumber }),
    }),
  list: (startDate?: string, endDate?: string, page?: number, perPage?: number): Promise<PaginatedOrders> => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (page) params.set("page", String(page));
    if (perPage) params.set("per_page", String(perPage));
    const qs = params.toString();
    return request(`/orders${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => request(`/orders/${id}`),
};

export function subscribeToEvents(onEvent: (data: any) => void): () => void {
  const es = new EventSource(`${API_URL}/events`);
  es.addEventListener("message", (event: any) => {
    try { onEvent(JSON.parse(event.data)); } catch { }
  });
  return () => es.close();
}
