import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { orders as orderApi, Order, formatPrice, PaginatedOrders, subscribeToEvents } from "../../services/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800", confirmed: "#2196F3", preparing: "#9C27B0",
  ready: "#4CAF50", paid: "#607D8B", cancelled: "#f44336",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 50;

  const loadOrders = useCallback(async (p: number) => {
    try {
      const data: PaginatedOrders = await orderApi.list(todayStr(), todayStr(), p, perPage);
      setOrders(data.orders);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { setPage(1); loadOrders(1); }, [loadOrders])
  );

  useEffect(() => { loadOrders(page); }, [page]);

  useEffect(() => {
    const unsub = subscribeToEvents(() => loadOrders(page));
    return unsub;
  }, [loadOrders, page]);

  const totalPages = Math.ceil(total / perPage);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        ListEmptyComponent={<View style={styles.centered}><Text style={{ fontSize: 16, color: "#888" }}>No orders today</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/order/${item.id}`)}
          >
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderId}>{item.order_id}</Text>
                <Text style={styles.tableText}>{item.table_number ? `Table ${item.table_number}` : "Take Away"}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || "#999" }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.orderTotal}>{formatPrice(item.total_amount)}</Text>
            <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={totalPages > 1 ? (
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 16 }}>
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
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  orderCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  orderHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  orderId: { fontSize: 16, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  orderTotal: { fontSize: 20, fontWeight: "700", color: "#4CAF50" },
  orderDate: { fontSize: 12, color: "#999", marginTop: 4 },
  tableText: { fontSize: 12, color: "#888", marginTop: 2 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#4CAF50", borderRadius: 8 },
  pageBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
