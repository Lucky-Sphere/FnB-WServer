import { useState } from "react";
import { auth, setToken } from "../services/api";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await auth.login(username, password);
      if (res.user.role !== "cashier") {
        setError("Cashier access required");
        return;
      }
      setToken(res.token);
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f5f5f5",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#fff", padding: "40px", borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)", width: "400px",
      }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", color: "#2e7d32" }}>
          FNB Cashier Login
        </h1>
        {error && (
          <p style={{ color: "#f44336", marginBottom: "16px", fontSize: "14px" }}>{error}</p>
        )}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Username</label>
          <input
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #ddd",
              borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #ddd",
              borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="submit" disabled={loading}
          style={{
            width: "100%", padding: "12px", background: loading ? "#a5d6a7" : "#4CAF50",
            color: "#fff", border: "none", borderRadius: "6px",
            fontSize: "16px", fontWeight: 600, cursor: "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
