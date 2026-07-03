import { useEffect, useState } from "react";
import { auth, setToken } from "./services/api";
import CashierPage from "./pages/CashierPage";

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("cashier_token");
    if (stored) { setReady(true); return; }
    auth.login("admin", "admin123").then((res) => {
      setToken(res.token);
      setReady(true);
    }).catch((e) => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#263238", color: "#ff6b6b" }}>
      <p>Connection error: {error}</p>
    </div>
  );

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#263238", color: "#888" }}>
      <p>Connecting...</p>
    </div>
  );

  return <CashierPage />;
}
