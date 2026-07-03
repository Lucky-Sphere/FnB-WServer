import { useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { orders as orderApi, formatPrice } from "../../services/api";
import { useCart } from "../../contexts/CartContext";
import Colors from "../../constants/Colors";

export default function CartScreen() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [takeaway, setTakeaway] = useState(false);
  const [tableNumber, setTableNumber] = useState("");

  const handlePlaceOrder = async () => {
    const tableNum = takeaway ? 0 : parseInt(tableNumber, 10);
    if (!takeaway && (!tableNum || tableNum < 1)) {
      Alert.alert("Invalid", "Please enter a table number");
      return;
    }
    setLoading(true);
    try {
      const orderItems = items.map((item) => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
      }));
      const order: any = await orderApi.create(orderItems, tableNum);
      clearCart();
      router.replace("/(tabs)/orders");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Browse the menu to add items</Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => router.push("/(tabs)/menu")}
        >
          <Text style={styles.browseBtnText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.menuItem.id)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.cartCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.menuItem.name}</Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.menuItem.price)} each
              </Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.itemTotal}>
                {formatPrice(item.menuItem.price * item.quantity)}
              </Text>
              <TouchableOpacity onPress={() => removeItem(item.menuItem.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.takeawayRow} onPress={() => { setTakeaway(!takeaway); setTableNumber(""); }}>
          <View style={[styles.takeawayCheckbox, takeaway && styles.takeawayChecked]}>
            {takeaway && <Text style={styles.takeawayCheckmark}>✓</Text>}
          </View>
          <Text style={styles.takeawayLabel}>Take Away</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.tableInput, takeaway && { opacity: 0.3 }]}
          placeholder="Table number"
          placeholderTextColor="#666"
          value={tableNumber}
          onChangeText={setTableNumber}
          keyboardType="number-pad"
          editable={!takeaway}
        />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total ({totalItems} item{totalItems !== 1 ? "s" : ""})
          </Text>
          <Text style={styles.totalAmount}>{formatPrice(totalAmount)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, loading && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tableInput: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 12, backgroundColor: Colors.white,
    textAlign: "center", fontWeight: "500", color: Colors.text,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { fontSize: 18, fontWeight: "600", color: Colors.textSecondary },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  browseBtn: {
    marginTop: 20, backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
  },
  browseBtnText: { color: Colors.white, fontWeight: "600", fontSize: 15 },
  cartCard: {
    backgroundColor: Colors.white, borderRadius: 10, padding: 16,
    marginBottom: 8, flexDirection: "row", alignItems: "center",
  },
  itemName: { fontSize: 16, fontWeight: "500", color: Colors.text },
  itemPrice: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  quantityRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center",
  },
  qtyBtnText: { color: Colors.white, fontSize: 16, fontWeight: "bold", marginTop: -2 },
  qtyText: { fontSize: 15, fontWeight: "600", minWidth: 20, textAlign: "center" },
  itemTotal: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  removeText: { fontSize: 12, color: Colors.danger, marginTop: 4 },
  takeawayRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  takeawayCheckbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    borderColor: Colors.primary, justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  takeawayChecked: { backgroundColor: Colors.primary },
  takeawayCheckmark: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  takeawayLabel: { fontSize: 15, fontWeight: "500", color: Colors.text },
  footer: {
    backgroundColor: Colors.white, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 12, alignItems: "center",
  },
  totalLabel: { fontSize: 16, fontWeight: "500", color: Colors.text },
  totalAmount: { fontSize: 24, fontWeight: "700", color: Colors.primary },
  checkoutBtn: {
    backgroundColor: Colors.primary, padding: 16,
    borderRadius: 10, alignItems: "center",
  },
  checkoutText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
});
