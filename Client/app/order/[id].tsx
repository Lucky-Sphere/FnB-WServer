import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { orders as orderApi, Order, formatPrice } from "../../services/api";

const COOLDOWN = 10;

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9800", confirmed: "#2196F3", preparing: "#9C27B0",
  ready: "#4CAF50", paid: "#607D8B", cancelled: "#f44336",
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchOrder = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data: Order = await orderApi.get(Number(id));
      setOrder(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
        startCooldown();
      }
    }
  }, [id, startCooldown]);

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [fetchOrder])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderId}>{order.order_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] || "#999" }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.date}>
        {new Date(order.created_at).toLocaleString()} &middot; {order.table_number ? `Table ${order.table_number}` : "Take Away"}
      </Text>
      <FlatList
        data={order.items || []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ marginTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name || `Item #${item.menu_item_id}`}</Text>
              <Text style={styles.itemQty}>x{item.quantity} @ {formatPrice(item.unit_price)}</Text>
            </View>
            <Text style={styles.itemTotal}>{formatPrice(item.subtotal)}</Text>
          </View>
        )}
      />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatPrice(order.total_amount)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.refreshBtn, (refreshing || cooldown > 0) && { opacity: 0.5, backgroundColor: "#999" }]}
        onPress={() => fetchOrder(true)}
        disabled={refreshing || cooldown > 0}
      >
        {refreshing ? (
          <ActivityIndicator color="#fff" />
        ) : cooldown > 0 ? (
          <Text style={styles.refreshText}>Wait {cooldown}s</Text>
        ) : (
          <Text style={styles.refreshText}>Refresh Status</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  orderId: { fontSize: 22, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: "#fff", fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
  date: { fontSize: 13, color: "#888", marginTop: 8 },
  itemRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", padding: 14, borderRadius: 8, marginBottom: 8,
  },
  itemName: { fontSize: 15, fontWeight: "500" },
  itemQty: { fontSize: 13, color: "#888", marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: "600" },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#ddd",
  },
  totalLabel: { fontSize: 18, fontWeight: "600" },
  totalAmount: { fontSize: 22, fontWeight: "700", color: "#4CAF50" },
  refreshBtn: {
    backgroundColor: "#4CAF50", padding: 14, borderRadius: 10,
    alignItems: "center", marginTop: 20,
  },
  refreshText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
