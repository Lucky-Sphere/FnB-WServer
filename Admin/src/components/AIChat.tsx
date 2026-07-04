import { useState, useRef, useEffect } from "react";
import { admin } from "../services/api";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! Ask me anything about your restaurant orders, menu, or operations." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res: any = await admin.chat.send(userMsg);
      setMessages((m) => [...m, { role: "ai", text: res.reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "ai", text: "Error: " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 1000,
          width: 56, height: 56, borderRadius: 28,
          background: open ? "#f44336" : "#4CAF50", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 24, fontWeight: "bold",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
        title={open ? "Close AI Chat" : "Open AI Chat"}
      >
        {open ? "✕" : "AI"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed", bottom: 84, right: 20, zIndex: 1000,
            width: 360, height: 480, background: "#fff", borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex",
            flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 16px", background: "#4CAF50", color: "#fff", fontWeight: 600, fontSize: 15 }}>
            AI Assistant
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#4CAF50" : "#f0f0f0",
                  color: m.role === "user" ? "#fff" : "#333",
                  padding: "10px 14px", borderRadius: 12,
                  maxWidth: "85%", fontSize: 14, lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about orders, menu..."
              disabled={loading}
              style={{
                flex: 1, padding: "10px 12px", border: "1px solid #ddd",
                borderRadius: 8, fontSize: 14, outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: "10px 16px", background: loading ? "#ccc" : "#4CAF50", color: "#fff",
                border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer", fontWeight: 600,
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
