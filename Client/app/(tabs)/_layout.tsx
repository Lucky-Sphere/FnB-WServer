import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useCart } from "../../contexts/CartContext";
import Colors from "../../constants/Colors";

function CartBadge() {
  const { totalItems } = useCart();
  if (totalItems === 0) return null;
  return (
    <View style={{
      position: "absolute", top: -4, right: -10,
      backgroundColor: Colors.danger, borderRadius: 10,
      width: 18, height: 18, justifyContent: "center", alignItems: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
        {totalItems > 99 ? "99+" : totalItems}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: Colors.primary,
      tabBarStyle: { paddingBottom: 4, height: 56 },
    }}>
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🍽</Text>,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color }) => (
            <View>
              <Text style={{ color, fontSize: 20 }}>🛒</Text>
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
    </Tabs>
  );
}
