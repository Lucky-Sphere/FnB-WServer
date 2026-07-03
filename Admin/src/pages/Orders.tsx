import React, { useEffect, useState, useCallback } from "react";
import { admin, Order, formatPrice, STATUS_COLORS, subscribeToEvents } from "../services/api";

const STATUSES = Object.keys(STATUS_COLORS);
const PER_PAGE = 50;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [details, setDetails] = useState<Record<number, Order>>({});
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());

  const loadOrders = useCallback(async (p: number) => {
    try {
      const data = await admin.orders.list(startDate, endDate, p, PER_PAGE);
      setOrders(data.orders);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { setPage(1); loadOrders(1); }, [loadOrders]);

  useEffect(() => { loadOrders(page); }, [page]);

  useEffect(() => {
    const unsub = subscribeToEvents((event) => {
      if (event.type === "order_placed" || event.type === "order_updated") loadOrders(page);
    });
    return unsub;
  }, [loadOrders, page]);

  const toggleExpand = async (order: Order) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id); else next.add(order.id);
      return next;
    });
    if (!details[order.id]) {
      try {
        const detail = await admin.orders.get(order.id);
        setDetails((prev) => ({ ...prev, [order.id]: detail }));
      } catch (e) { console.error(e); }
    }
  };

  const handleStatus = async (id: number, status: string) => {
    try {
      const updated = await admin.orders.updateStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setDetails((prev) => ({ ...prev, [id]: updated }));
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <p>Loading...</p>;

  const totalPaid = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Orders</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "13px", color: "#666" }}>From</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setLoading(true); }}
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px" }} />
          <label style={{ fontSize: "13px", color: "#666" }}>To</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setLoading(true); }}
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px" }} />
        </div>
      </div>

      <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#e8f5e9", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "14px", color: "#2e7d32", fontWeight: 500 }}>Total Paid</span>
        <span style={{ fontSize: "20px", fontWeight: 700, color: "#2e7d32" }}>{formatPrice(totalPaid)}</span>
      </div>

      {orders.length === 0 ? (
        <p style={{ color: "#888" }}>No orders yet.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>ID</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Total</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                    onClick={() => toggleExpand(order)}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {expandedIds.has(order.id) ? "▾ " : "▸ "}{order.order_id || `#${order.id}`}
                      {order.created_at && order.status !== "paid" && order.status !== "cancelled" && (Date.now() - new Date(order.created_at).getTime()) > 3600000 && (
                        <span style={{ color: "#f44336", fontWeight: "bold", fontSize: 16, marginLeft: 8 }}>!</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: "12px", fontSize: "12px",
                        fontWeight: 600, textTransform: "capitalize",
                        background: STATUS_COLORS[order.status] || "#999", color: "#fff",
                      }}>{order.status}</span>
                    </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{formatPrice(order.total_amount)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <select
                        value={order.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatus(order.id, e.target.value)}
                        style={{
                          padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px",
                          fontSize: "12px", cursor: "pointer",
                        }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                  {expandedIds.has(order.id) && (
                    <tr key={`${order.id}-detail`}>
                      <td colSpan={4} style={{ padding: "0 12px 12px 12px" }}>
                        <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "16px", marginTop: 4 }}>
                          <p style={{ fontSize: "13px", color: "#888", margin: "0 0 12px 0" }}>
                            {order.table_number ? `Table ${order.table_number}` : "Take Away"} &middot; {order.created_at ? new Date(order.created_at).toLocaleString() : "-"}
                          </p>
                          {!details[order.id] ? (
                            <p style={{ color: "#888", fontSize: "14px" }}>Loading...</p>
                          ) : (
                            <>
                              {(details[order.id].items || []).map((item) => {
                                const canEdit = order.status !== "ready" && order.status !== "paid";
                                return (
                                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #eee", gap: 8 }}>
                                  <span style={{ flex: 1 }}>{item.name || `Item #${item.menu_item_id}`}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <button
                                      disabled={!canEdit}
                                      onClick={async () => {
                                        if (item.quantity <= 1) {
                                          if (!confirm(`Remove "${item.name}" from order?`)) return;
                                        }
                                        const qty = item.quantity <= 1 ? 1 : item.quantity - 1;
                                        if (qty < 1) {
                                          const updated = await admin.orders.deleteItem(order.id, item.id);
                                          setDetails((p) => ({ ...p, [order.id]: updated }));
                                          setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
                                        } else {
                                          const updated = await admin.orders.updateItem(order.id, item.id, qty);
                                          setDetails((p) => ({ ...p, [order.id]: updated }));
                                          setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
                                        }
                                      }}
                                      style={{ width: 24, height: 24, borderRadius: 12, border: "1px solid #ddd", background: canEdit ? "#fff" : "#f5f5f5", cursor: canEdit ? "pointer" : "not-allowed", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1, opacity: canEdit ? 1 : 0.4 }}
                                    >−</button>
                                    <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                                    <button
                                      disabled={!canEdit}
                                      onClick={async () => {
                                        const updated = await admin.orders.updateItem(order.id, item.id, item.quantity + 1);
                                        setDetails((p) => ({ ...p, [order.id]: updated }));
                                        setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
                                      }}
                                      style={{ width: 24, height: 24, borderRadius: 12, border: "1px solid #ddd", background: canEdit ? "#fff" : "#f5f5f5", cursor: canEdit ? "pointer" : "not-allowed", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1, opacity: canEdit ? 1 : 0.4 }}
                                    >+</button>
                                  </div>
                                  <span style={{ fontWeight: 600, minWidth: 60, textAlign: "right" }}>{formatPrice(item.subtotal)}</span>
                                  <button
                                    disabled={!canEdit}
                                    onClick={async () => {
                                      if (!confirm(`Remove "${item.name}" from order?`)) return;
                                      const updated = await admin.orders.deleteItem(order.id, item.id);
                                      setDetails((p) => ({ ...p, [order.id]: updated }));
                                      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
                                    }}
                                    style={{ background: "none", border: "none", color: "#f44336", cursor: canEdit ? "pointer" : "not-allowed", fontSize: 16, lineHeight: 1, padding: "2px 4px", opacity: canEdit ? 1 : 0.3 }}
                                    title="Delete item"
                                  >✕</button>
                                </div>
                                );
                              })}
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0", fontWeight: 700, fontSize: "15px" }}>
                                <span>Total</span>
                                <span>{formatPrice(order.total_amount)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "20px", fontSize: "13px" }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                style={{ padding: "6px 14px", border: "1px solid #ddd", borderRadius: "6px", background: page <= 1 ? "#f5f5f5" : "#fff", cursor: page <= 1 ? "default" : "pointer", color: page <= 1 ? "#bbb" : "#333", fontWeight: 500 }}>
                Prev
              </button>
              <span style={{ color: "#666" }}>Page {page} of {totalPages} ({total} orders)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                style={{ padding: "6px 14px", border: "1px solid #ddd", borderRadius: "6px", background: page >= totalPages ? "#f5f5f5" : "#fff", cursor: page >= totalPages ? "default" : "pointer", color: page >= totalPages ? "#bbb" : "#333", fontWeight: 500 }}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
