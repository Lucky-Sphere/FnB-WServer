import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { setToken, settings, getBusinessName } from "../services/api";

export default function Layout() {
  const navigate = useNavigate();
  const [name, setName] = useState(getBusinessName());

  useEffect(() => {
    (async () => {
      await settings.init();
      setName(getBusinessName());
    })();
  }, []);

  const handleLogout = () => {
    setToken(null);
    navigate("/login");
  };

  const btnStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: "14px",
    background: isActive ? "#2e7d32" : "#e8f5e9",
    color: isActive ? "#fff" : "#2e7d32",
    textDecoration: "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <nav style={{
        background: "#fff", borderBottom: "1px solid #e0e0e0",
        padding: "12px 24px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
      }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#2e7d32", marginRight: "16px", whiteSpace: "nowrap" }}>
          {name} Admin
        </h1>
        <NavLink to="/" end style={({ isActive }) => btnStyle(isActive)}>Dashboard</NavLink>
        <NavLink to="/orders" style={({ isActive }) => btnStyle(isActive)}>Orders</NavLink>
        <NavLink to="/menu" style={({ isActive }) => btnStyle(isActive)}>Menu</NavLink>
        <NavLink to="/members" style={({ isActive }) => btnStyle(isActive)}>Members</NavLink>
        <NavLink to="/settings" style={({ isActive }) => btnStyle(isActive)}>Settings</NavLink>
        <button
          onClick={handleLogout}
          style={{
            marginLeft: "auto", background: "none", border: "1px solid #e0e0e0",
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", color: "#666",
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      </nav>
      <main style={{ padding: "24px" }}>
        <Outlet />
      </main>
    </div>
  );
}
