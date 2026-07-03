import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { menu as menuApi, categories as catApi, MenuItem, Category, formatPrice } from "../../services/api";
import { useCart } from "../../contexts/CartContext";
import Colors from "../../constants/Colors";

export default function MenuScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem, removeItem, updateQuantity, items: cartItems } = useCart();

  useEffect(() => {
    (async () => {
      try {
        const [menuData, catData]: [MenuItem[], Category[]] = await Promise.all([
          menuApi.list(),
          catApi.list(),
        ]);
        setItems(menuData);
        setCategories(catData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getCartQty = useCallback(
    (id: number) => cartItems.find((i) => i.menuItem.id === id)?.quantity || 0,
    [cartItems]
  );

  const handleDecrement = useCallback(
    (item: MenuItem, qty: number) => {
      if (qty <= 1) {
        Alert.alert("Remove Item", `Remove "${item.name}" from cart?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeItem(item.id),
          },
        ]);
      } else {
        updateQuantity(item.id, qty - 1);
      }
    },
    [removeItem, updateQuantity]
  );

  const filtered = selectedCategory
    ? items.filter((i) => i.category_id === selectedCategory)
    : items;

  const categoryName = (id: number) =>
    categories.find((c) => c.id === id)?.name || "";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={[{ id: null as any, name: "All", sort_order: 0 }, ...categories]}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item.id && styles.categoryTextActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No items in this category</Text>
        ) : (
          filtered.map((item) => {
            const qty = getCartQty(item.id);
            return (
              <View key={item.id} style={styles.menuCard}>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuName}>{item.name}</Text>
                  <Text style={styles.menuCategory}>
                    {categoryName(item.category_id)}
                  </Text>
                  <Text style={styles.menuDesc}>{item.description}</Text>
                  <Text style={styles.menuPrice}>
                    {formatPrice(item.price)}
                  </Text>
                </View>
                <View style={styles.actions}>
                  {qty > 0 ? (
                    <View style={styles.quantityRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => addItem(item)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleDecrement(item, qty)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => addItem(item)}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 12, flexGrow: 1 },
  emptyText: { textAlign: "center", color: Colors.textSecondary, fontSize: 15 },
  categoryList: { maxHeight: 50, marginVertical: 8 },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: { fontSize: 14, color: Colors.textSecondary },
  categoryTextActive: { color: Colors.white, fontWeight: "600" },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuInfo: { flex: 1 },
  menuName: { fontSize: 16, fontWeight: "600", marginBottom: 2, color: Colors.text },
  menuCategory: { fontSize: 12, color: Colors.primary, marginBottom: 4, fontWeight: "500" },
  menuDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  menuPrice: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  actions: { justifyContent: "flex-start", marginLeft: 12 },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: { color: Colors.white, fontWeight: "600", fontSize: 14 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: { color: Colors.white, fontSize: 18, fontWeight: "bold" },
  qtyText: { fontSize: 16, fontWeight: "600", minWidth: 20, textAlign: "center" },
});
