const API = "/api";

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

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

export const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800",
  confirmed: "#2196F3",
  preparing: "#9C27B0",
  ready: "#4CAF50",
  paid: "#607D8B",
  cancelled: "#f44336",
};

let authToken = localStorage.getItem("cashier_token");

export function setToken(t: string) {
  authToken = t;
  localStorage.setItem("cashier_token", t);
}

function request<T>(path: string, options?: RequestInit): Promise<T> {
  return fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options?.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export const auth = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { role: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};

export const orders = {
  list: async (): Promise<Order[]> => {
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const res = await request<{ orders: Order[] }>(`/admin/orders?start_date=${d}&end_date=${d}&page=1&per_page=200`);
    return res.orders;
  },
  get: (id: number) => request<Order>(`/admin/orders/${id}`),
  updateStatus: (id: number, status: string) =>
    request<Order>(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

export function subscribeToEvents(onEvent: (data: any) => void) {
  const es = new EventSource(API + "/events");
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)); } catch {}
  };
  es.onerror = () => {};
  return () => es.close();
}
