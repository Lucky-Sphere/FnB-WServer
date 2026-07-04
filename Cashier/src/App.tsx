import { useState } from "react";
import CashierPage from "./pages/CashierPage";
import Login from "./pages/Login";

export default function App() {
  const [ready, setReady] = useState(!!localStorage.getItem("cashier_token"));

  if (!ready) return <Login onLogin={() => setReady(true)} />;

  return <CashierPage />;
}
