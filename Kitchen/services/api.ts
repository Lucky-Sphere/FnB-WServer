import AsyncStorage from "@react-native-async-storage/async-storage";
import EventSource from "react-native-sse";

const API_URL = "http://192.168.68.133:20080/api";

export interface OrderItemDetail {
  id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_done: boolean;
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

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const auth = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { role: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};

export interface PaginatedResult {
  orders: Order[];
  total: number;
  page: number;
  per_page: number;
}

export const orders = {
  list: async (page?: number, perPage?: number): Promise<PaginatedResult> => {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (perPage) params.set("per_page", String(perPage));
    const qs = params.toString();
    return request<PaginatedResult>(`/kitchen/orders${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => request<Order>(`/kitchen/orders/${id}`),
  updateStatus: (id: number, status: string) =>
    request<Order>(`/kitchen/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  toggleItemDone: (orderId: number, itemId: number, isDone: boolean) =>
    request<Order>(`/kitchen/orders/${orderId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ is_done: isDone }),
    }),
};

export function subscribeToEvents(onEvent: (data: any) => void): () => void {
  const es = new EventSource(`${API_URL}/events`);
  es.addEventListener("message", (event: any) => {
    try { onEvent(JSON.parse(event.data)); } catch { }
  });
  return () => es.close();
}
