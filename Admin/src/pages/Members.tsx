import { useEffect, useState } from "react";
import { admin } from "../services/api";
import type { User } from "../services/api";

const PAGE_SIZE = 20;

export default function Members() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addRole, setAddRole] = useState("customer");
  const [addUsername, setAddUsername] = useState("");
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");

  const load = () => admin.users.list().then(setUsers);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      const data: any = {};
      if (editUsername && editUsername !== editUser.username) data.username = editUsername;
      if (editName && editName !== editUser.name) data.name = editName;
      if (editPassword) data.password = editPassword;
      if (editRole && editRole !== editUser.role) data.role = editRole;
      if (Object.keys(data).length === 0) { setEditUser(null); return; }
      const updated = await admin.users.update(editUser.id, data);
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(""), 2000);
      setEditPassword("");
    } catch (e: any) { alert(e.message); }
  };

  const handleAdd = async () => {
    if (!addUsername || !addName || !addPassword) return;
    try {
      await admin.users.create(addUsername, addPassword, addName, addRole);
      await load();
      setShowAdd(false);
      setAddUsername("");
      setAddName("");
      setAddPassword("");
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <p>Loading...</p>;

  const q = search.toLowerCase();
  const filtered = users.filter((u) => !q || u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <input
          placeholder="Search by username or name…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ width: "300px", padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Members ({filtered.length})</h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "13px" }}>
                <button disabled={page === 0} onClick={() => setPage(page - 1)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: "4px", background: page === 0 ? "#f5f5f5" : "#fff", cursor: page === 0 ? "default" : "pointer", color: page === 0 ? "#bbb" : "#333" }}>Prev</button>
                <span style={{ color: "#666" }}>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: "4px", background: page >= totalPages - 1 ? "#f5f5f5" : "#fff", cursor: page >= totalPages - 1 ? "default" : "pointer", color: page >= totalPages - 1 ? "#bbb" : "#333" }}>Next</button>
              </div>
            )}
            <button onClick={() => { setAddRole("customer"); setShowAdd(true); }} style={{ padding: "6px 14px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Add Member</button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontSize: "13px", color: "#888" }}>ID</th>
              <th style={{ padding: "8px 12px", fontSize: "13px", color: "#888" }}>Username</th>
              <th style={{ padding: "8px 12px", fontSize: "13px", color: "#888" }}>Name</th>
              <th style={{ padding: "8px 12px", fontSize: "13px", color: "#888" }}>Role</th>
              <th style={{ padding: "8px 12px", fontSize: "13px", color: "#888" }}>Registered</th>
              <th style={{ padding: "8px 12px", fontSize: "13px", color: "#888" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 12px" }}>{u.id}</td>
                <td style={{ padding: "10px 12px", color: "#666", fontSize: "13px" }}>{u.username}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, background: u.role === "admin" ? "#e3f2fd" : "#f3e5f5", color: u.role === "admin" ? "#1565C0" : "#7B1FA2", textTransform: "capitalize" }}>{u.role === "customer" ? "Client" : u.role === "kitchen" ? "Kitchen" : u.role}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "#888", fontSize: "13px" }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={() => { setEditUser(u); setEditUsername(u.username); setEditName(u.name); setEditPassword(""); setEditRole(u.role); }} style={{ padding: "4px 12px", background: "#2196F3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#999", fontSize: "13px" }}>No members found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditUser(null)}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "360px", maxWidth: "90vw", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" }}>Edit User</h3>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Username</label>
              <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}>
                <option value="customer">Client</option>
                <option value="admin">Admin</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>New Password (leave blank to keep)</label>
              <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            {savedMsg && <p style={{ color: "#4CAF50", fontSize: "13px", fontWeight: 600, margin: "0 0 12px 0", textAlign: "center" }}>{savedMsg}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSaveEdit} style={{ flex: 1, padding: "10px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>
                Save
              </button>
              <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: "10px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "360px", maxWidth: "90vw", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" }}>Add Member</h3>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Username</label>
              <input value={addUsername} onChange={(e) => setAddUsername(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Name</label>
              <input value={addName} onChange={(e) => setAddName(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Role</label>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}>
                <option value="customer">Client</option>
                <option value="admin">Admin</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Password</label>
              <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAdd} disabled={!addUsername || !addName || !addPassword} style={{ flex: 1, padding: "10px", background: addUsername && addName && addPassword ? "#4CAF50" : "#ccc", color: "#fff", border: "none", borderRadius: "6px", cursor: addUsername && addName && addPassword ? "pointer" : "default", fontWeight: 600 }}>
                Create
              </button>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "10px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
