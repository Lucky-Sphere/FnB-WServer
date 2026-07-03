import { useEffect, useState, useCallback } from "react";
import { admin, HourlyDataPoint, ItemPieDataPoint, formatPrice, settings as settingsApi, subscribeToEvents } from "../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const [totalSales, setTotalSales] = useState(0);
  const [bestSeller, setBestSeller] = useState<ItemPieDataPoint | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyDataPoint[]>([]);
  const [openingHour, setOpeningHour] = useState(8);
  const [closingHour, setClosingHour] = useState(22);

  const loadData = useCallback(async () => {
    try {
      const [hourly, pie, cfg] = await Promise.all([
        admin.sales.hourlyToday(),
        admin.sales.itemToday(),
        settingsApi.get(),
      ]);
      setHourlyData(hourly);
      setTotalSales(hourly.reduce((sum, h) => sum + h.total, 0));
      setBestSeller(pie.length > 0 ? pie[0] : null);
      setOpeningHour(parseInt(cfg.opening_hour) || 8);
      setClosingHour(parseInt(cfg.closing_hour) || 22);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unsub = subscribeToEvents((event) => {
      if (event.type === "order_placed") loadData();
    });
    return unsub;
  }, [loadData]);

  const cumulatives = Array.from({ length: 24 }, (_, i) => i).reduce((acc, h) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    const cur = hourlyData.find((d) => d.hour === h)?.total || 0;
    acc.push(prev + cur);
    return acc;
  }, [] as number[]);
  const chartData = Array.from({ length: closingHour - openingHour + 1 }, (_, i) => openingHour + i).map((h) => ({
    hour: h < 12 ? `${h}AM` : h === 12 ? `12PM` : `${h - 12}PM`,
    total: cumulatives[h] || 0,
  }));

  const card = (title: string, value: string | number, color: string) => (
    <div style={{
      background: "#fff", borderRadius: "10px", padding: "24px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flex: 1, minWidth: "200px",
    }}>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 8px 0" }}>{title}</p>
      <p style={{ fontSize: "32px", fontWeight: "bold", color, margin: 0 }}>
        {title === "Best Seller" ? value : formatPrice(typeof value === "number" ? value : Number(value))}
      </p>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        {card("Total Sales", totalSales, "#2196F3")}
        {card("Best Seller", bestSeller ? `${bestSeller.name} (${bestSeller.count})` : "—", "#FF9800")}
      </div>

      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 16px 0" }}>
          Sales Today
        </h2>
        {chartData.every((d) => d.total === 0) ? (
            <p style={{ color: "#888", fontSize: 14 }}>No sales data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis orientation="right" tick={{ fontSize: 12 }} label={{ value: "Sales", angle: 90, position: "insideRight", style: { fontSize: 12 } }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#4CAF50" strokeWidth={2} dot={{ r: 4 }} name="Total" />
              </LineChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
