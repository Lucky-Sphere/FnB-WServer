import { useEffect, useState, useCallback } from "react";
import { orders, Order, STATUS_COLORS, subscribeToEvents } from "../services/api";

function formatPrice(v: number) { return `RM ${v.toFixed(2)}`; }

export default function CashierPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = await orders.list();
      setAllOrders(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const unsub = subscribeToEvents(() => loadOrders());
    return unsub;
  }, [loadOrders]);

  const handlePay = async (id: number) => {
    try {
      const updated = await orders.updateStatus(id, "paid");
      setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setSelected(null);
    } catch (e: any) { alert(e.message); }
  };

  const visible = allOrders.filter((o) => ["pending", "confirmed", "preparing", "ready"].includes(o.status));

  return (
    <div style={{ minHeight: "100vh", background: "#eceff1", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", margin: "0 0 16px 0", color: "#37474f" }}>Cashier</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 400 }}>
          {visible.length === 0 && <p style={{ color: "#888", fontSize: 16 }}>No unpaid orders.</p>}
          {visible.map((order) => (
            <div key={order.id} onClick={() => { setSelected(order); orders.get(order.id).then((d) => setSelected(d)); }}
              style={{ background: "#fff", borderRadius: 10, padding: 16, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", cursor: "pointer", border: selected?.id === order.id ? "2px solid #4CAF50" : "2px solid transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 18 }}>#{order.order_id || order.id}</strong>
                  <span style={{ marginLeft: 12, color: "#888" }}>{order.table_number ? `Table ${order.table_number}` : "Take Away"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                    textTransform: "capitalize", background: STATUS_COLORS[order.status] || "#999", color: "#fff",
                  }}>{order.status}</span>
                  <span style={{ fontWeight: "bold", fontSize: 18, minWidth: 80, textAlign: "right" }}>{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <div style={{ flex: 1, minWidth: 300, background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", alignSelf: "flex-start", position: "sticky", top: 16 }}>
            <h2 style={{ fontSize: 18, margin: "0 0 4px 0" }}>Order #{selected.order_id || selected.id}</h2>
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 16px 0" }}>{selected.table_number ? `Table ${selected.table_number}` : "Take Away"}</p>
            <div style={{ borderTop: "1px solid #eee", paddingTop: 12, marginBottom: 16 }}>
              {(selected.items || []).map((item, i) => (
                <div key={item.id || i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 15, borderBottom: "1px solid #f5f5f5" }}>
                  <span>{item.name || `Item #${item.menu_item_id}`} <span style={{ color: "#888" }}>x{item.quantity}</span></span>
                  <span style={{ fontWeight: 600 }}>{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: "bold", marginBottom: 16, paddingTop: 8, borderTop: "2px solid #333" }}>
              <span>Total</span>
              <span>{formatPrice(selected.total_amount)}</span>
            </div>
            {selected.status !== "paid" && selected.status !== "cancelled" && (
              <button onClick={() => handlePay(selected.id)}
                style={{ width: "100%", padding: 16, background: "#4CAF50", color: "#fff", border: "none", borderRadius: 8, fontSize: 20, fontWeight: "bold", cursor: "pointer" }}>
                MARK AS PAID
              </button>
            )}
            {selected.status === "paid" && (
              <p style={{ color: "#607D8B", textAlign: "center", fontSize: 16, fontWeight: 600 }}>Already Paid</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
