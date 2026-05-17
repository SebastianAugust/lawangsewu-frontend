import { useState, useEffect } from "react";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getWeekRange,
} from "../api/report";
import {
  exportDailyPdf,
  exportDailyXlsx,
  exportWeeklyPdf,
  exportWeeklyXlsx,
  exportMonthlyPdf,
  exportMonthlyXlsx,
} from "../api/export";
import MainLayout from "../layouts/MainLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Ban,
  Calendar,
  FileDown,
  FileSpreadsheet,
  Sparkles,
  Award,
  Wallet,
  CalendarRange,
  CalendarDays,
  Layers,
  Clock,
} from "lucide-react";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];
const DAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function VariantBreakdownGrid({ data, formatRupiah }) {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        Belum ada data orderan untuk periode ini.
      </div>
    );
  }
  const filtered = data.filter((m) => {
    const hasVariants =
      m.variants.length > 1 ||
      (m.variants[0] && m.variants[0].name !== "(tanpa varian)");
    return hasVariants;
  });
  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        Tidak ada menu dengan varian yang terjual di periode ini.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {filtered.map((m) => {
        const maxQty = m.variants[0]?.qty || 1;
        return (
          <div
            key={m.menu_id}
            className="bg-stone-50 rounded-xl p-4 border border-amber-700/15"
          >
            <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-amber-700/15">
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 truncate">
                  {m.menu_name}
                </p>
                <p className="text-[11px] text-amber-700/60 mt-0.5">
                  {m.category_name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-amber-900 tabular-nums">
                  {m.total_qty}{" "}
                  <span className="text-xs font-normal text-amber-700/60">
                    pcs
                  </span>
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold tabular-nums">
                  {formatRupiah(m.total_revenue)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {m.variants.map((v, i) => {
                const pct = (v.qty / maxQty) * 100;
                return (
                  <div key={v.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-amber-900/80">
                        {v.name}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        <span className="font-bold text-amber-900">
                          {v.qty}
                        </span>{" "}
                        pcs · {formatRupiah(v.revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-amber-100/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, accent = "amber" }) {
  const accents = {
    amber: "from-amber-500/10 to-orange-500/5 text-amber-600 ring-amber-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 ring-emerald-500/20",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 ring-blue-500/20",
    purple: "from-purple-500/10 to-purple-500/5 text-purple-600 ring-purple-500/20",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 ring-rose-500/20",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition group">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} ring-1 flex items-center justify-center`}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        {trend !== undefined && trend !== null && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trend >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="font-display text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {trendLabel && <p className="text-[11px] text-slate-400 mt-1">{trendLabel}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 px-3.5 py-2.5 text-xs min-w-[150px]">
      {label !== undefined && label !== null && label !== "" && (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pb-1.5 border-b border-slate-100">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || entry.fill || entry.payload?.fill }}
              />
              <span className="text-slate-600 capitalize truncate">{entry.name}</span>
            </div>
            <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap">
              {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const renderActiveSlice = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  );
};

function CategoryDonut({ data, formatRupiah }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">Belum ada data</div>
    );
  }

  const sorted = [...data].sort(
    (a, b) => Number(b.total_revenue) - Number(a.total_revenue),
  );
  const total = sorted.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
  const chartData = sorted.map((c) => ({
    name: c.category,
    value: Number(c.total_revenue),
  }));
  const activeCat = activeIndex !== null ? sorted[activeIndex] : null;
  const centerLabel = activeCat
    ? activeCat.category
    : "Total";
  const centerValue = activeCat
    ? formatRupiah(activeCat.total_revenue)
    : formatRupiah(total);
  const centerSub = activeCat
    ? `${((Number(activeCat.total_revenue) / total) * 100).toFixed(1)}%`
    : `${sorted.length} kategori`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={3}
              dataKey="value"
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveSlice}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(v) =>
                    `${formatRupiah(v)} · ${((Number(v) / total) * 100).toFixed(1)}%`
                  }
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {centerLabel}
          </p>
          <p className="font-display font-bold text-slate-900 text-lg leading-tight mt-0.5 tabular-nums">
            {centerValue}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{centerSub}</p>
        </div>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {sorted.map((c, i) => {
          const value = Number(c.total_revenue);
          const pct = total > 0 ? (value / total) * 100 : 0;
          const isActive = activeIndex === i;
          return (
            <button
              key={c.category}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`w-full text-left rounded-xl px-2.5 py-2 transition border ${
                isActive
                  ? "border-slate-200 bg-stone-50 shadow-sm"
                  : "border-transparent hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="font-semibold text-slate-800 text-sm truncate">
                    {c.category}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                  {formatRupiah(value)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentBreakdown({ data, formatRupiah }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">Belum ada data</div>
    );
  }
  const totalCount = data.reduce((sum, p) => sum + Number(p.count || 0), 0);
  const PAYMENT_META = {
    cash: { color: "from-emerald-500 to-emerald-600", text: "text-emerald-600" },
    qris: { color: "from-blue-500 to-blue-600", text: "text-blue-600" },
  };
  return (
    <div className="space-y-2.5">
      {data.map((p) => {
        const share = totalCount > 0 ? (Number(p.count) / totalCount) * 100 : 0;
        const meta = PAYMENT_META[p.payment_method?.toLowerCase()] || {
          color: "from-amber-500 to-orange-500",
          text: "text-amber-600",
        };
        return (
          <div
            key={p.payment_method}
            className="bg-gradient-to-br from-stone-50 to-white rounded-xl p-3.5 border border-slate-200/60"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {p.payment_method}
              </p>
              <p className={`text-sm font-bold ${meta.text} tabular-nums`}>
                {formatRupiah(p.total)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 bg-gradient-to-r ${meta.color} rounded-full transition-all duration-500`}
                  style={{ width: `${share}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-slate-600 tabular-nums whitespace-nowrap">
                {p.count} · {share.toFixed(0)}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopMenusTable({ data, formatRupiah, title = "Menu Terjual", subtitle }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-500" />
        <h4 className="font-display font-bold text-slate-900">{title}</h4>
        {subtitle && <span className="text-xs text-slate-400 ml-1">— {subtitle}</span>}
      </div>
      {!data || data.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">Belum ada data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  #
                </th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Menu
                </th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Kategori
                </th>
                <th className="text-right px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Terjual
                </th>
                <th className="text-right px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Pendapatan
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={item.menu_id}
                  className="border-t border-slate-100 hover:bg-stone-50/50 transition"
                >
                  <td className="px-5 py-3 text-sm text-slate-400 font-medium">
                    {index < 3 ? (
                      <span
                        className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-bold ${
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                              ? "bg-slate-100 text-slate-600"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                    {item.menu?.name}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {item.menu?.category?.name}
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-900 text-right tabular-nums">
                    {item.total_sold}
                  </td>
                  <td className="px-5 py-3 text-sm text-emerald-600 font-semibold text-right tabular-nums">
                    {formatRupiah(item.total_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [weekDate, setWeekDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState("daily");
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDailyReport(date).then((res) => {
      if (!cancelled) setDailyReport(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeeklyLoading(true);
    getWeeklyReport(weekDate)
      .then((res) => {
        if (cancelled) return;
        setWeeklyReport(res.data);
      })
      .finally(() => {
        if (!cancelled) setWeeklyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekDate]);

  useEffect(() => {
    let cancelled = false;
    getMonthlyReport(month, year).then((res) => {
      if (!cancelled) setMonthlyReport(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const formatRupiah = (num) => `Rp ${Number(num).toLocaleString("id-ID")}`;
  const formatRupiahShort = (num) => {
    const n = Number(num);
    if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
    if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}k`;
    return `Rp ${n}`;
  };
  const formatDateShort = (d) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  // ============ Summary builders ============
  const dailySummary = () => {
    if (!dailyReport || dailyReport.total_orders === 0)
      return "Belum ada transaksi hari ini.";
    const revenueChange =
      dailyReport.yesterday_revenue > 0
        ? Math.round(
            ((dailyReport.total_revenue - dailyReport.yesterday_revenue) /
              dailyReport.yesterday_revenue) *
              100,
          )
        : null;
    const topMenu = dailyReport.menu_sales[0];
    const topCategory = dailyReport.category_sales?.sort(
      (a, b) => b.total_revenue - a.total_revenue,
    )[0];
    let summary = `Hari ini ada ${dailyReport.total_orders} pesanan dengan total pendapatan ${formatRupiah(dailyReport.total_revenue)}.`;
    if (revenueChange !== null) {
      summary +=
        revenueChange >= 0
          ? ` Naik ${revenueChange}% dari kemarin.`
          : ` Turun ${Math.abs(revenueChange)}% dari kemarin.`;
    }
    if (topMenu)
      summary += ` Menu paling laris: ${topMenu.menu?.name} (${topMenu.total_sold} porsi).`;
    if (topCategory) summary += ` Kategori terlaris: ${topCategory.category}.`;
    if (dailyReport.total_voided > 0)
      summary += ` Ada ${dailyReport.total_voided} transaksi yang di-void.`;
    return summary;
  };

  const weeklySummary = () => {
    if (!weeklyReport || weeklyReport.total_orders === 0)
      return "Belum ada data minggu ini.";
    const change =
      weeklyReport.last_week_revenue > 0
        ? Math.round(
            ((weeklyReport.total_revenue - weeklyReport.last_week_revenue) /
              weeklyReport.last_week_revenue) *
              100,
          )
        : null;
    const topMenu = weeklyReport.top_menus[0];
    let s = `Minggu ${formatDateShort(weeklyReport.week_start)} – ${formatDateShort(weeklyReport.week_end)}: ${weeklyReport.total_orders} pesanan, pendapatan ${formatRupiah(weeklyReport.total_revenue)}, rata-rata ${formatRupiah(weeklyReport.avg_daily)}/hari.`;
    if (change !== null)
      s += change >= 0 ? ` Naik ${change}% dari minggu lalu.` : ` Turun ${Math.abs(change)}% dari minggu lalu.`;
    if (topMenu)
      s += ` Menu terlaris: ${topMenu.menu?.name} (${topMenu.total_sold} porsi).`;
    if (weeklyReport.best_day)
      s += ` Hari terbaik: ${formatDateShort(weeklyReport.best_day.date)} (${formatRupiah(weeklyReport.best_day.revenue)}).`;
    return s;
  };

  const monthlySummary = () => {
    if (!monthlyReport || monthlyReport.total_orders === 0)
      return "Belum ada data bulan ini.";
    const monthName = new Date(2000, monthlyReport.month - 1).toLocaleString("id-ID", {
      month: "long",
    });
    const revenueChange =
      monthlyReport.last_month_revenue > 0
        ? Math.round(
            ((monthlyReport.total_revenue - monthlyReport.last_month_revenue) /
              monthlyReport.last_month_revenue) *
              100,
          )
        : null;
    let summary = `Bulan ${monthName}: total ${monthlyReport.total_orders} pesanan, pendapatan ${formatRupiah(monthlyReport.total_revenue)}, rata-rata ${formatRupiah(monthlyReport.avg_daily)}/hari.`;
    if (revenueChange !== null) {
      summary +=
        revenueChange >= 0
          ? ` Naik ${revenueChange}% dari bulan lalu.`
          : ` Turun ${Math.abs(revenueChange)}% dari bulan lalu.`;
    }
    if (monthlyReport.best_day)
      summary += ` Hari terbaik: ${new Date(monthlyReport.best_day.date).toLocaleDateString("id-ID")} (${formatRupiah(monthlyReport.best_day.revenue)}).`;
    return summary;
  };

  // ============ Chart data ============
  const hourlyChartData =
    dailyReport?.hourly_sales?.map((h) => ({
      hour: `${String(h.hour).padStart(2, "0")}:00`,
      pesanan: h.orders,
      pendapatan: Number(h.revenue),
    })) || [];

  const weeklyChartData =
    weeklyReport?.daily_revenue?.map((d, i) => ({
      hari: DAYS_ID[i],
      tanggal: formatDateShort(d.date),
      pendapatan: d.revenue,
      pesanan: d.orders,
    })) || [];

  const weeklyHourlyData =
    weeklyReport?.hourly_sales?.map((h) => ({
      hour: `${String(h.hour).padStart(2, "0")}:00`,
      pesanan: h.orders,
      pendapatan: Number(h.revenue),
    })) || [];

  const dailyRevenueChartData =
    monthlyReport?.daily_revenue?.map((d) => ({
      tanggal: new Date(d.date).getDate().toString(),
      pendapatan: Number(d.revenue),
      pesanan: d.orders,
    })) || [];

  const monthlyHourlyData =
    monthlyReport?.hourly_sales?.map((h) => ({
      hour: `${String(h.hour).padStart(2, "0")}:00`,
      pesanan: h.orders,
      pendapatan: Number(h.revenue),
    })) || [];

  // ============ Trends ============
  const revenueTrend =
    dailyReport?.yesterday_revenue > 0
      ? Math.round(
          ((dailyReport.total_revenue - dailyReport.yesterday_revenue) /
            dailyReport.yesterday_revenue) *
            100,
        )
      : null;

  const weeklyTrend =
    weeklyReport?.last_week_revenue > 0
      ? Math.round(
          ((weeklyReport.total_revenue - weeklyReport.last_week_revenue) /
            weeklyReport.last_week_revenue) *
            100,
        )
      : null;

  const monthlyTrend =
    monthlyReport?.last_month_revenue > 0
      ? Math.round(
          ((monthlyReport.total_revenue - monthlyReport.last_month_revenue) /
            monthlyReport.last_month_revenue) *
            100,
        )
      : null;

  const peakHour =
    hourlyChartData.length > 0
      ? hourlyChartData.reduce((a, b) => (b.pesanan > a.pesanan ? b : a))
      : null;

  const weekRange = getWeekRange(weekDate);

  const tabs = [
    { value: "daily", label: "Harian", icon: Calendar },
    { value: "weekly", label: "Mingguan", icon: CalendarDays },
    { value: "monthly", label: "Bulanan", icon: CalendarRange },
  ];

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau performa restoran Anda secara real-time.
          </p>
        </div>
        <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ DAILY TAB ============ */}
      {tab === "daily" && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={() => exportDailyPdf(date, dailyReport)}
              disabled={!dailyReport}
              className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              onClick={() => exportDailyXlsx(date, dailyReport)}
              disabled={!dailyReport}
              className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>

          {dailyReport && (
            <>
              <div className="bg-batik-light border border-amber-700/20 rounded-xl p-5 mb-6 flex items-start gap-3 relative overflow-hidden">
                <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Ringkasan Hari Ini
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{dailySummary()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={DollarSign}
                  label="Pendapatan"
                  value={formatRupiah(dailyReport.total_revenue)}
                  trend={revenueTrend}
                  trendLabel={
                    dailyReport.yesterday_revenue > 0
                      ? `kemarin: ${formatRupiahShort(dailyReport.yesterday_revenue)}`
                      : null
                  }
                  accent="emerald"
                />
                <StatCard
                  icon={ShoppingBag}
                  label="Total Pesanan"
                  value={dailyReport.total_orders}
                  trendLabel={
                    dailyReport.yesterday_orders > 0
                      ? `kemarin: ${dailyReport.yesterday_orders}`
                      : null
                  }
                  accent="blue"
                />
                <StatCard
                  icon={Wallet}
                  label="Rata-rata/Pesanan"
                  value={
                    dailyReport.total_orders > 0
                      ? formatRupiah(
                          Math.round(dailyReport.total_revenue / dailyReport.total_orders),
                        )
                      : "Rp 0"
                  }
                  accent="purple"
                />
                <StatCard
                  icon={Ban}
                  label="Void"
                  value={dailyReport.total_voided}
                  accent="rose"
                />
              </div>

              {/* Hourly chart — full width */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Pesanan per Jam
                    </h4>
                  </div>
                  {peakHour && peakHour.pesanan > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
                      Jam tersibuk: {peakHour.hour} ({peakHour.pesanan} pesanan)
                    </span>
                  )}
                </div>
                {hourlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart
                      data={hourlyChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dailyBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="dailyRevArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        dy={4}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                        width={36}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(245,158,11,0.06)" }}
                        content={
                          <ChartTooltip
                            valueFormatter={(val, name) =>
                              name === "pendapatan" ? formatRupiah(val) : val
                            }
                          />
                        }
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="pesanan"
                        fill="url(#dailyBarGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={28}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="pendapatan"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#dailyRevArea)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Belum ada data
                  </div>
                )}
              </div>

              {/* Category list + Payment side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
                <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Pendapatan per Kategori
                    </h4>
                  </div>
                  <CategoryDonut
                    data={dailyReport.category_sales}
                    formatRupiah={formatRupiah}
                  />
                </div>
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Metode Pembayaran
                    </h4>
                  </div>
                  <PaymentBreakdown
                    data={dailyReport.payment_breakdown}
                    formatRupiah={formatRupiah}
                  />
                </div>
              </div>

              <TopMenusTable
                data={dailyReport.menu_sales}
                formatRupiah={formatRupiah}
                title="Menu Terjual"
                subtitle="Prediksi kebutuhan besok"
              />

              <div className="mt-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <h4 className="font-display font-bold text-amber-900">
                    Detail Varian Terjual
                  </h4>
                  <span className="text-xs text-amber-700/60">
                    - varian yang terjual hari ini
                  </span>
                </div>
                <VariantBreakdownGrid
                  data={dailyReport.variant_breakdown}
                  formatRupiah={formatRupiah}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ============ WEEKLY TAB ============ */}
      {tab === "weekly" && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              {formatDateShort(weekRange.start)} – {formatDateShort(weekRange.end)}
            </span>
            {weeklyLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Memuat...
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => exportWeeklyPdf(weeklyReport)}
              disabled={!weeklyReport || weeklyLoading}
              className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              onClick={() => exportWeeklyXlsx(weeklyReport)}
              disabled={!weeklyReport || weeklyLoading}
              className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>

          {weeklyReport && !weeklyLoading && (
            <>
              <div className="bg-batik-light border border-amber-700/20 rounded-xl p-5 mb-6 flex items-start gap-3 relative overflow-hidden">
                <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Ringkasan Mingguan
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{weeklySummary()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={DollarSign}
                  label="Total Pendapatan"
                  value={formatRupiah(weeklyReport.total_revenue)}
                  trend={weeklyTrend}
                  trendLabel={
                    weeklyReport.last_week_revenue > 0
                      ? `minggu lalu: ${formatRupiahShort(weeklyReport.last_week_revenue)}`
                      : null
                  }
                  accent="emerald"
                />
                <StatCard
                  icon={ShoppingBag}
                  label="Total Pesanan"
                  value={weeklyReport.total_orders}
                  trendLabel={
                    weeklyReport.last_week_orders > 0
                      ? `minggu lalu: ${weeklyReport.last_week_orders}`
                      : null
                  }
                  accent="blue"
                />
                <StatCard
                  icon={Wallet}
                  label="Rata-rata/Hari"
                  value={formatRupiah(weeklyReport.avg_daily)}
                  accent="purple"
                />
                <StatCard
                  icon={Award}
                  label="Hari Terbaik"
                  value={
                    weeklyReport.best_day
                      ? formatRupiahShort(weeklyReport.best_day.revenue)
                      : "-"
                  }
                  trendLabel={
                    weeklyReport.best_day
                      ? formatDateShort(weeklyReport.best_day.date)
                      : null
                  }
                  accent="amber"
                />
              </div>

              {/* Daily breakdown chart */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm mb-6">
                <h4 className="font-display font-bold text-slate-900 mb-4">
                  Pendapatan & Pesanan Harian
                </h4>
                {weeklyChartData.some((d) => d.pendapatan > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={weeklyChartData}>
                      <defs>
                        <linearGradient id="weekBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="weekRevArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hari"
                        tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        dy={4}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                        width={36}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(245,158,11,0.06)" }}
                        content={
                          <ChartTooltip
                            labelFormatter={(label, items) =>
                              items?.[0]?.payload?.tanggal
                                ? `${label} · ${items[0].payload.tanggal}`
                                : label
                            }
                            valueFormatter={(val, name) =>
                              name === "pendapatan" ? formatRupiah(val) : val
                            }
                          />
                        }
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="pesanan"
                        fill="url(#weekBarGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="pendapatan"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#weekRevArea)"
                        dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Belum ada data minggu ini
                  </div>
                )}
              </div>

              {/* Hourly aggregate */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h4 className="font-display font-bold text-slate-900">
                    Pola Jam Sibuk (Mingguan)
                  </h4>
                </div>
                {weeklyHourlyData.some((h) => h.pesanan > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={weeklyHourlyData}
                      margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="weekHourBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        interval={1}
                        dy={4}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(139,92,246,0.08)" }}
                        content={
                          <ChartTooltip
                            valueFormatter={(val, name) =>
                              name === "pendapatan" ? formatRupiah(val) : val
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="pesanan"
                        fill="url(#weekHourBar)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Belum ada data
                  </div>
                )}
              </div>

              {/* Category & Payment */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
                <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Pendapatan per Kategori
                    </h4>
                  </div>
                  <CategoryDonut
                    data={weeklyReport.category_sales}
                    formatRupiah={formatRupiah}
                  />
                </div>
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Metode Pembayaran
                    </h4>
                  </div>
                  <PaymentBreakdown
                    data={weeklyReport.payment_breakdown}
                    formatRupiah={formatRupiah}
                  />
                </div>
              </div>

              <TopMenusTable
                data={weeklyReport.top_menus}
                formatRupiah={formatRupiah}
                title="Top Menu Mingguan"
                subtitle="Akumulasi 7 hari"
              />

              <div className="mt-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <h4 className="font-display font-bold text-amber-900">
                    Detail Varian Terjual
                  </h4>
                  <span className="text-xs text-amber-700/60">
                    — akumulasi varian 7 hari
                  </span>
                </div>
                <VariantBreakdownGrid
                  data={weeklyReport.variant_breakdown}
                  formatRupiah={formatRupiah}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ============ MONTHLY TAB ============ */}
      {tab === "monthly" && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString("id-ID", { month: "long" })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
            />
            <div className="flex-1" />
            <button
              onClick={() => exportMonthlyPdf(month, year, monthlyReport)}
              disabled={!monthlyReport}
              className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              onClick={() => exportMonthlyXlsx(month, year, monthlyReport)}
              disabled={!monthlyReport}
              className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-600 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>

          {monthlyReport && (
            <>
              <div className="bg-batik-light border border-amber-700/20 rounded-xl p-5 mb-6 flex items-start gap-3 relative overflow-hidden">
                <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Ringkasan Bulan Ini
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{monthlySummary()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={DollarSign}
                  label="Total Pendapatan"
                  value={formatRupiah(monthlyReport.total_revenue)}
                  trend={monthlyTrend}
                  trendLabel={
                    monthlyReport.last_month_revenue > 0
                      ? `bulan lalu: ${formatRupiahShort(monthlyReport.last_month_revenue)}`
                      : null
                  }
                  accent="emerald"
                />
                <StatCard
                  icon={ShoppingBag}
                  label="Total Pesanan"
                  value={monthlyReport.total_orders}
                  accent="blue"
                />
                <StatCard
                  icon={Wallet}
                  label="Rata-rata/Hari"
                  value={formatRupiah(monthlyReport.avg_daily)}
                  accent="purple"
                />
                <StatCard
                  icon={Award}
                  label="Hari Terbaik"
                  value={
                    monthlyReport.best_day
                      ? formatRupiahShort(monthlyReport.best_day.revenue)
                      : "-"
                  }
                  trendLabel={
                    monthlyReport.best_day
                      ? new Date(monthlyReport.best_day.date).toLocaleDateString("id-ID")
                      : null
                  }
                  accent="amber"
                />
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm mb-6">
                <h4 className="font-display font-bold text-slate-900 mb-4">
                  Pendapatan Harian
                </h4>
                {dailyRevenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart
                      data={dailyRevenueChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="monthRevArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="tanggal"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        dy={4}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                        width={36}
                      />
                      <Tooltip
                        cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "3 3" }}
                        content={
                          <ChartTooltip
                            labelFormatter={(label) => `Tanggal ${label}`}
                            valueFormatter={(val, name) =>
                              name === "pendapatan" ? formatRupiah(val) : val
                            }
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="pendapatan"
                        stroke="none"
                        fill="url(#monthRevArea)"
                      />
                      <Line
                        type="monotone"
                        dataKey="pendapatan"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Belum ada data
                  </div>
                )}
              </div>

              {/* Hourly aggregate (monthly) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h4 className="font-display font-bold text-slate-900">
                    Pola Jam Sibuk (Bulanan)
                  </h4>
                </div>
                {monthlyHourlyData.some((h) => h.pesanan > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={monthlyHourlyData}
                      margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="monthHourBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        interval={1}
                        dy={4}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(139,92,246,0.08)" }}
                        content={
                          <ChartTooltip
                            valueFormatter={(val, name) =>
                              name === "pendapatan" ? formatRupiah(val) : val
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="pesanan"
                        fill="url(#monthHourBar)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Belum ada data
                  </div>
                )}
              </div>

              {/* Category & Payment side by side (monthly) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
                <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Pendapatan per Kategori
                    </h4>
                  </div>
                  <CategoryDonut
                    data={monthlyReport.category_sales}
                    formatRupiah={formatRupiah}
                  />
                </div>
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    <h4 className="font-display font-bold text-slate-900">
                      Metode Pembayaran
                    </h4>
                  </div>
                  <PaymentBreakdown
                    data={monthlyReport.payment_breakdown}
                    formatRupiah={formatRupiah}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h4 className="font-display font-bold text-slate-900">
                    Top Menu Bulan Ini
                  </h4>
                </div>
                {monthlyReport.top_menus.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Belum ada data
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monthlyReport.top_menus.map((item, index) => {
                      const maxSold = monthlyReport.top_menus[0]?.total_sold || 1;
                      const percentage = (item.total_sold / maxSold) * 100;
                      return (
                        <div key={item.menu_id}>
                          <div className="flex justify-between items-center text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${
                                  index === 0
                                    ? "bg-amber-100 text-amber-700"
                                    : index === 1
                                      ? "bg-slate-100 text-slate-600"
                                      : index === 2
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-slate-50 text-slate-400"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {item.menu?.name}
                              </span>
                            </div>
                            <span className="text-slate-500 text-xs">
                              <span className="font-bold text-slate-700">
                                {item.total_sold}
                              </span>{" "}
                              porsi · {formatRupiah(item.total_revenue)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Variant breakdown — auto-loads */}
              <div className="mt-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Layers className="w-4 h-4 text-amber-700" />
                    <h4 className="font-display font-bold text-amber-900">
                      Detail Varian Terjual
                    </h4>
                    <span className="text-xs text-amber-700/60">
                      - rincian per varian (Dada, Paha, Panas, Es, dll)
                    </span>
                  </div>
                </div>
                <VariantBreakdownGrid
                  data={monthlyReport.variant_breakdown}
                  formatRupiah={formatRupiah}
                />
              </div>
            </>
          )}
        </>
      )}
    </MainLayout>
  );
}

export default DashboardPage;
