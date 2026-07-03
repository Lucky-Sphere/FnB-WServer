import { useEffect, useState } from "react";
import { admin, MenuItem, Category, formatPrice } from "../services/api";

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category_id: 0, name: "", description: "", price: 0, is_available: true });

  const [showCatForm, setShowCatForm] = useState(false);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [menuData, catData] = await Promise.all([
          admin.menu.list(),
          admin.categories.list(),
        ]);
        setItems(menuData);
        setCategories(catData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const resetForm = () => {
    setForm({ category_id: categories[0]?.id || 0, name: "", description: "", price: 0, is_available: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (item: MenuItem) => {
    setForm({ category_id: item.category_id, name: item.name, description: item.description, price: item.price, is_available: item.is_available });
    setEditing(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const updated = await admin.menu.update(editing.id, form);
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
      } else {
        const created = await admin.menu.create(form);
        setItems((prev) => [...prev, created]);
      }
      resetForm();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      await admin.menu.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  const resetCatForm = () => {
    setCatName("");
    setCatSortOrder(0);
    setCatEditing(null);
    setShowCatForm(false);
  };

  const handleCatEdit = (cat: Category) => {
    setCatName(cat.name);
    setCatSortOrder(cat.sort_order);
    setCatEditing(cat);
    setShowCatForm(true);
  };

  const handleCatSave = async () => {
    try {
      if (catEditing) {
        const updated = await admin.categories.update(catEditing.id, catName, catSortOrder);
        setCategories((prev) => prev.map((c) => (c.id === catEditing.id ? updated : c)));
      } else {
        const created = await admin.categories.create(catName, catSortOrder);
        setCategories((prev) => [...prev, created]);
      }
      resetCatForm();
    } catch (e: any) { alert(e.message); }
  };

  const handleCatDelete = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await admin.categories.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <p>Loading...</p>;

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name || "Unknown";

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Categories</h3>
          <button
            onClick={() => { resetCatForm(); setShowCatForm(true); }}
            style={{ padding: "6px 14px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
          >
            Add Category
          </button>
        </div>
        {categories.length === 0 ? (
          <p style={{ color: "#888", fontSize: "13px" }}>No categories.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ textAlign: "left", padding: "6px 12px", fontSize: "12px", color: "#888" }}>Name</th>
                <th style={{ textAlign: "left", padding: "6px 12px", fontSize: "12px", color: "#888" }}>Sort Order</th>
                <th style={{ textAlign: "left", padding: "6px 12px", fontSize: "12px", color: "#888" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: "14px" }}>{cat.name}</td>
                  <td style={{ padding: "8px 12px", color: "#666", fontSize: "13px" }}>{cat.sort_order}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <button onClick={() => handleCatEdit(cat)} style={{ marginRight: "6px", padding: "3px 10px", background: "#2196F3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Edit</button>
                    <button onClick={() => handleCatDelete(cat.id)} style={{ padding: "3px 10px", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Menu Items</h2>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              padding: "8px 16px", background: "#4CAF50", color: "#fff",
              border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600,
            }}
          >
            Add Item
          </button>
        </div>
        {items.length === 0 ? (
          <p style={{ color: "#888" }}>No menu items.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Name</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Category</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Price</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Available</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "13px", color: "#888" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: "10px 12px", color: "#666", fontSize: "13px" }}>{categoryName(item.category_id)}</td>
                  <td style={{ padding: "10px 12px" }}>{formatPrice(item.price)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: item.is_available ? "#4CAF50" : "#f44336", fontWeight: 600 }}>
                      {item.is_available ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => handleEdit(item)} style={{ marginRight: "8px", padding: "4px 12px", background: "#2196F3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: "4px 12px", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCatForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={resetCatForm}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "360px", maxWidth: "90vw", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" }}>
              {catEditing ? "Edit Category" : "Add Category"}
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Name</label>
              <input value={catName} onChange={(e) => setCatName(e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Sort Order</label>
              <input type="number" value={catSortOrder} onChange={(e) => setCatSortOrder(Number(e.target.value))}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleCatSave} style={{ flex: 1, padding: "10px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>
                {catEditing ? "Update" : "Create"}
              </button>
              <button onClick={resetCatForm} style={{ flex: 1, padding: "10px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={resetForm}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "400px", maxWidth: "90vw", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" }}>
              {editing ? "Edit Item" : "Add Item"}
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Category</label>
              <select
                value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              >
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box", minHeight: "60px" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: 500 }}>Price</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label>
                <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
                <span style={{ marginLeft: "8px", fontSize: "13px" }}>Available</span>
              </label>
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
        </div>
      )}
    </div>
  );
}
