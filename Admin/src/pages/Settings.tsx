import { useEffect, useState } from "react";
import { admin, settings as settingsApi } from "../services/api";

export default function Settings() {
  const [currencySymbol, setCurrencySymbol] = useState("RM");
  const [businessName, setBusinessName] = useState("FNB");
  const [openingHour, setOpeningHour] = useState("8");
  const [closingHour, setClosingHour] = useState("22");
  const [aiApiKey, setAiApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await settingsApi.get();
        setCurrencySymbol(data.currency_symbol || "RM");
        setBusinessName(data.business_name || "FNB");
        setOpeningHour(data.opening_hour || "8");
        setClosingHour(data.closing_hour || "22");
        setAiApiKey(data.ai_api_key || "");
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    if (!currencySymbol.trim() || !businessName.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await admin.settings.update("currency_symbol", currencySymbol.trim());
      await admin.settings.update("business_name", businessName.trim());
      await admin.settings.update("opening_hour", openingHour.trim());
      await admin.settings.update("closing_hour", closingHour.trim());
      await admin.settings.update("ai_api_key", aiApiKey.trim());
      setMessage("Settings saved");
    } catch (e: any) {
      setMessage("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: "500px", background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 20px 0" }}>Settings</h2>
      <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: 6, color: "#555" }}>
        Business Name
      </label>
      <input
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ddd",
          borderRadius: "6px", fontSize: "16px", marginBottom: 16, boxSizing: "border-box",
        }}
      />
      <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: 6, color: "#555" }}>
        Currency Symbol
      </label>
      <input
        value={currencySymbol}
        onChange={(e) => setCurrencySymbol(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ddd",
          borderRadius: "6px", fontSize: "16px", marginBottom: 16, boxSizing: "border-box",
        }}
      />
      <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: 6, color: "#555" }}>
        Opening Hour (0-23)
      </label>
      <input
        type="number" min="0" max="23"
        value={openingHour}
        onChange={(e) => setOpeningHour(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ddd",
          borderRadius: "6px", fontSize: "16px", marginBottom: 16, boxSizing: "border-box",
        }}
      />
      <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: 6, color: "#555" }}>
        Closing Hour (0-23)
      </label>
      <input
        type="number" min="0" max="23"
        value={closingHour}
        onChange={(e) => setClosingHour(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ddd",
          borderRadius: "6px", fontSize: "16px", marginBottom: 16, boxSizing: "border-box",
        }}
      />
      <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: 6, color: "#555" }}>
        AI API Key
      </label>
      <input
        value={aiApiKey}
        onChange={(e) => setAiApiKey(e.target.value)}
        placeholder="Leave empty to disable AI chat"
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #ddd",
          borderRadius: "6px", fontSize: "14px", marginBottom: 16, boxSizing: "border-box",
        }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 24px", background: "#4CAF50", color: "#fff",
          border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600,
        }}
      >
        {saving ? "Saving..." : "Save"}
      </button>
      {message && (
        <p style={{ marginTop: 12, fontSize: "14px", color: message.startsWith("Error") ? "#f44336" : "#4CAF50" }}>
          {message}
        </p>
      )}
    </div>
  );
}
