import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { Audio } from "expo-av";
import { orders, Order, PaginatedResult, setToken, subscribeToEvents } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800",
  confirmed: "#2196F3",
  preparing: "#9C27B0",
  ready: "#4CAF50",
  paid: "#607D8B",
  cancelled: "#f44336",
};

const TABS = ["Orders", "Complete", "Cancel"] as const;
const TAB_FILTER: Record<string, string[]> = {
  Orders: ["pending", "confirmed", "preparing"],
  Complete: ["ready", "paid"],
  Cancel: ["cancelled"],
};

export default function KitchenScreen() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState("Orders");
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(require("../assets/doorbell.wav"));
      soundRef.current = sound;
    })();
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("kitchen_token");
      if (stored) {
        setToken(stored);
        setAuthed(true);
      }
      setAuthReady(true);
    })();
  }, []);

  const perPage = 50;

  const loadOrders = useCallback(async (p: number) => {
    try {
      const data: PaginatedResult = await orders.list(p, perPage);
      const withItems = await Promise.all(
        data.orders.map(async (o) => {
          if (!o.items) {
            try { return await orders.get(o.id); } catch { return o; }
          }
          return o;
        })
      );
      setAllOrders(withItems);
      setTotal(data.total);
    } catch (e) { console.warn("load orders failed", e); }
  }, []);

  useEffect(() => { loadOrders(page); }, [loadOrders, page]);

  useEffect(() => {
    const unsub = subscribeToEvents((event) => {
      if (event.type === "order_placed") {
        soundRef.current?.replayAsync().catch(() => {});
      }
      loadOrders(page);
    });
    return unsub;
  }, [loadOrders, page]);

  if (!authReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!authed) return <Redirect href="/(auth)/login" />;

  const handleStatus = async (id: number, status: string) => {
    try {
      const updated = await orders.updateStatus(id, status);
      setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (e: any) { console.warn(e); }
  };

  const toggleItemDone = async (orderId: number, itemId: number, currentDone: boolean) => {
    try {
      const updated = await orders.toggleItemDone(orderId, itemId, !currentDone);
      setAllOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (e: any) { Alert.alert("Error", e.message || "Failed to update item"); }
  };

  const handleTabChange = (t: string) => {
    setTab(t);
    setPage(1);
  };

  const totalPages = Math.ceil(total / perPage);

  const visible = allOrders
    .filter((o) => TAB_FILTER[tab]?.includes(o.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const handleLogout = async () => {
    await AsyncStorage.removeItem("kitchen_token");
    setToken(null);
    setAuthed(false);
  };

  const showCheckboxes = tab === "Orders";
  const showTick = tab === "Complete";

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>Kitchen Display</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => handleTabChange(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {visible.length === 0 && (
          <Text style={styles.empty}>No {tab.toLowerCase()} orders.</Text>
        )}
        {visible.map((order) => {
          const allDone = (order.items || []).length > 0 && (order.items || []).every((i) => i.is_done);
          return (
            <View key={order.id} style={[styles.card, {
              borderColor: order.status === "preparing" ? "#e94560" : order.status === "confirmed" ? "#2196F3" : "#e0e0e0",
            }]}>
              <View style={[styles.cardTopBar, { backgroundColor: order.table_number ? "#E3F2FD" : "#FFF3E0" }]}>
                <Text style={[styles.cardTopText, { color: order.table_number ? "#1565C0" : "#E65100" }]}>
                  {order.table_number ? `Table ${order.table_number}` : "Take Away"}
                </Text>
              </View>
              <View style={{ padding: 16, paddingTop: 12 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.meta}>
                    {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </Text>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                    backgroundColor: STATUS_COLORS[order.status] || "#666",
                  }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>{order.status}</Text>
                  </View>
                </View>
              <View style={styles.itemsBox}>
                {(order.items || []).map((item, i) => (
                  <TouchableOpacity
                    key={item.id || i}
                    style={styles.itemRow}
                    onPress={showCheckboxes ? () => toggleItemDone(order.id, item.id, item.is_done) : undefined}
                    disabled={!showCheckboxes}
                  >
                    {showCheckboxes ? (
                      <Text style={[styles.checkbox, item.is_done && styles.checkboxDone]}>
                        {item.is_done ? "☑" : "☐"}
                      </Text>
                    ) : showTick ? (
                      <Text style={[styles.checkbox, styles.checkboxDone]}>✓</Text>
                    ) : null}
                    <Text style={[styles.itemName, showCheckboxes && item.is_done && styles.itemDone]}>
                      {item.name || `Item #${item.menu_item_id}`} <Text style={{ color: "#888" }}>x{item.quantity}</Text>
                    </Text>
                  </TouchableOpacity>
                ))}
                {!order.items && <Text style={{ color: "#888" }}>Loading...</Text>}
              </View>
              {tab === "Orders" && (
                <View style={styles.actions}>
                  {allDone && (
                    <TouchableOpacity style={[styles.btn, { backgroundColor: "#4CAF50" }]} onPress={() => handleStatus(order.id, "ready")}>
                      <Text style={styles.btnText}>COMPLETE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {totalPages > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 8 }}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => setPage(page - 1)}
            style={[styles.pageBtn, page <= 1 && { opacity: 0.4 }]}
          >
            <Text style={styles.pageBtnText}>Prev</Text>
          </TouchableOpacity>
          <Text style={{ color: "#666", fontSize: 14 }}>{page} / {totalPages}</Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => setPage(page + 1)}
            style={[styles.pageBtn, page >= totalPages && { opacity: 0.4 }]}
          >
            <Text style={styles.pageBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 12 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  header: { color: "#333", fontSize: 24, fontWeight: "bold" },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e53935" },
  logoutText: { color: "#e53935", fontSize: 14, fontWeight: "600" },
  tabBar: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", backgroundColor: "#e0e0e0" },
  tabActive: { backgroundColor: "#4CAF50" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#555" },
  tabTextActive: { color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  empty: { color: "#888", fontSize: 16, textAlign: "center", padding: 40, width: "100%" },
  card: { width: "48%", minWidth: 300, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, marginBottom: 12, backgroundColor: "#fff", overflow: "hidden" },
  cardTopBar: { paddingVertical: 6, paddingHorizontal: 16 },
  cardTopText: { fontSize: 14, fontWeight: "bold", textAlign: "center" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderId: { color: "#666", fontSize: 14, fontWeight: "normal" },
  meta: { color: "#888", fontSize: 14 },
  takeawayTag: { color: "#E65100", fontSize: 14, fontWeight: "bold", backgroundColor: "#FFF3E0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  tableBadge: { color: "#1565C0", fontSize: 14, fontWeight: "bold", backgroundColor: "#E3F2FD", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  itemsBox: { backgroundColor: "#fafafa", borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#eee" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  checkbox: { fontSize: 20, marginRight: 10, color: "#333" },
  checkboxDone: { color: "#4CAF50" },
  itemName: { color: "#333", fontSize: 16, flex: 1 },
  itemDone: { textDecorationLine: "line-through", color: "#999" },
  actions: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#4CAF50", borderRadius: 8 },
  pageBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
