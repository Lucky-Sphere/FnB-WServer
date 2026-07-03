import { useEffect, useState } from "react";
import { admin, Category } from "../services/api";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await admin.categories.list();
        setCategories(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const resetForm = () => {
    setName("");
    setSortOrder(0);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (cat: Category) => {
    setName(cat.name);
    setSortOrder(cat.sort_order);
    setEditing(cat);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const updated = await admin.categories.update(editing.id, name, sortOrder);
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await admin.categories.create(name, sortOrder);
        setCategories((prev) => [...prev, created]);
      }
      resetForm();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await admin.categories.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Categories</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            padding: "8px 16px", background: "#4CAF50", color: "#fff",
            border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600,
          }}
        >
          Add Category
        </button>
      </div>

      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          {categories.length === 0 ? (
            <p style={{ color: "#888" }}>No categories.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Sort Order</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{cat.name}</td>
                    <td style={{ padding: "10px 12px", color: "#666" }}>{cat.sort_order}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => handleEdit(cat)} style={{ marginRight: "8px", padding: "4px 12px", background: "#2196F3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                      <button onClick={() => handleDelete(cat.id)} style={{ padding: "4px 12px", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showForm && (
          <div style={{ width: "350px", background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", alignSelf: "start" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" }}>
              {editing ? "Edit Category" : "Add Category"}
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Sort Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSave} style={{ flex: 1, padding: "10px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>
                {editing ? "Update" : "Create"}
              </button>
              <button onClick={resetForm} style={{ flex: 1, padding: "10px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
