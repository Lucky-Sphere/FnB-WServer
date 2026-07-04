import { useEffect, useState, useCallback } from "react";
import { orders, Order, STATUS_COLORS, subscribeToEvents, setToken } from "../services/api";

function formatPrice(v: number) { return `RM ${v.toFixed(2)}`; }

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

interface TableGroup {
  tableNumber: number;
  orders: Order[];
}

export default function CashierPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TableGroup | null>(null);
  const [payment, setPayment] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const data = await orders.list();
      setAllOrders(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const unsub = subscribeToEvents(() => { setSelectedGroup(null); setPayment(""); loadOrders(); });
    return unsub;
  }, [loadOrders]);

  const handlePay = async (group: TableGroup) => {
    try {
      for (const o of group.orders) {
        await orders.updateStatus(o.id, "paid");
      }
      setSelectedGroup(null);
      setPayment("");
    } catch (e: any) { alert(e.message); }
  };

  const visible = allOrders
    .filter((o) => ["pending", "confirmed", "preparing", "ready"].includes(o.status));

  const groups: TableGroup[] = Object.values(
    visible.reduce<Record<number, TableGroup>>((acc, o) => {
      const tn = o.table_number;
      if (!acc[tn]) acc[tn] = { tableNumber: tn, orders: [] };
      acc[tn].orders.push(o);
      return acc;
    }, {})
  ).sort((a, b) => (a.tableNumber || 999) - (b.tableNumber || 999));

  const combinedTotal = selectedGroup
    ? selectedGroup.orders.reduce((s, o) => s + o.total_amount, 0)
    : 0;

  const paid = parseFloat(payment) || 0;
  const balance = paid - combinedTotal;

  return (
    <div style={{ minHeight: "100vh", background: "#eceff1", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", margin: 0, color: "#37474f" }}>Cashier</h1>
        <button onClick={() => { setToken(""); window.location.reload(); }}
          style={{ background: "none", border: "1px solid #ccc", padding: "6px 14px", borderRadius: 6, cursor: "pointer", color: "#666", fontWeight: 500 }}>
          Logout
        </button>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 2, minWidth: 400 }}>
          {!selectedGroup ? (
            <div style={{ background: "#fff", borderRadius: 10, padding: 40, textAlign: "center", color: "#aaa", fontSize: 16 }}>
              Select a table from the right panel
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h2 style={{ fontSize: 22, margin: "0 0 2px 0", color: "#37474f" }}>
                {selectedGroup.tableNumber ? `Table ${selectedGroup.tableNumber}` : "Take Away"}
              </h2>
              <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px 0" }}>
                {selectedGroup.orders.length} order{selectedGroup.orders.length > 1 ? "s" : ""} &middot;
                {selectedGroup.orders.map((o, i) => (
                  <span key={o.id}> #{o.order_id || o.id}{i < selectedGroup.orders.length - 1 ? "," : ""}</span>
                ))}
              </p>
              <div style={{ borderTop: "1px solid #eee", paddingTop: 12, marginBottom: 16 }}>
                {selectedGroup.orders.map((o, oi) => (
                  <div key={o.id}>
                    {oi > 0 && <div style={{ height: 1, background: "#eee", margin: "8px 0" }} />}
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#888", margin: "0 0 8px 0" }}>
                      Order #{o.order_id || o.id}
                    </p>
                    {(o.items || []).map((item, i) => (
                      <div key={item.id || i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 15, borderBottom: "1px solid #f5f5f5" }}>
                        <span>{item.name || `Item #${item.menu_item_id}`} <span style={{ color: "#888" }}>x{item.quantity}</span></span>
                        <span style={{ fontWeight: 600 }}>{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, fontWeight: 600, color: "#555" }}>
                      <span>Order Total</span>
                      <span>{formatPrice(o.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: "bold", marginBottom: 20, paddingTop: 8, borderTop: "2px solid #333" }}>
                <span>Total</span>
                <span>{formatPrice(combinedTotal)}</span>
              </div>
              {selectedGroup.orders.some((o) => o.status !== "paid" && o.status !== "cancelled") ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#555" }}>Payment by Customer</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "#555" }}>RM</span>
                      <input type="number" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00"
                        style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 18, fontWeight: 600, outline: "none" }} />
                    </div>
                    {paid > 0 && (
                      <p style={{ fontSize: 16, fontWeight: 600, margin: "8px 0 0 0", color: balance >= 0 ? "#4CAF50" : "#f44336" }}>
                        Balance: {formatPrice(Math.abs(balance))} {balance >= 0 ? "(Change)" : "(Short)"}
                      </p>
                    )}
                  </div>
                  <button onClick={() => handlePay(selectedGroup)} disabled={paid < combinedTotal}
                    style={{ width: "100%", padding: 16, background: paid >= combinedTotal ? "#4CAF50" : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontSize: 20, fontWeight: "bold", cursor: paid >= combinedTotal ? "pointer" : "default" }}>
                    {paid >= combinedTotal ? "MARK AS PAID" : `Short RM ${(combinedTotal - paid).toFixed(2)}`}
                  </button>
                </>
              ) : (
                <p style={{ color: "#607D8B", textAlign: "center", fontSize: 16, fontWeight: 600 }}>Already Paid</p>
              )}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 280, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          {groups.length === 0 && <p style={{ color: "#888", fontSize: 16, textAlign: "center" }}>No unpaid orders.</p>}
          {groups.map((g) => {
            const groupTotal = g.orders.reduce((s, o) => s + o.total_amount, 0);
            const isSelected = selectedGroup?.tableNumber === g.tableNumber;
            return (
              <div key={g.tableNumber} onClick={async () => {
                const withItems = await Promise.all(g.orders.map((o) => orders.get(o.id)));
                setSelectedGroup({ ...g, orders: withItems });
                setPayment("");
              }}
                style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", cursor: "pointer", border: isSelected ? "2px solid #4CAF50" : "2px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 18 }}>{g.tableNumber ? `Table ${g.tableNumber}` : "Take Away"}</strong>
                    <span style={{ display: "block", fontSize: 11, color: "#999" }}>
                      {g.orders.length} order{g.orders.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: "bold", fontSize: 16, display: "block" }}>{formatPrice(groupTotal)}</span>
                    {g.orders.length > 1 && (
                      <span style={{ fontSize: 11, color: "#888" }}>
                        {g.orders.map((o) => (
                          <span key={o.id} style={{
                            padding: "1px 5px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            textTransform: "capitalize", background: STATUS_COLORS[o.status] || "#999", color: "#fff", marginLeft: 2,
                          }}>{o.status}</span>
                        ))}
                      </span>
                    )}
                    {g.orders.length === 1 && (
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        textTransform: "capitalize", background: STATUS_COLORS[g.orders[0].status] || "#999", color: "#fff", display: "inline-block", marginTop: 4,
                      }}>{g.orders[0].status}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
