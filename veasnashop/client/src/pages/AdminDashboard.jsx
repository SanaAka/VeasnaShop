import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chartMode, setChartMode] = useState("revenue");
  const [orderTab, setOrderTab] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [kpis, setKpis] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [chartData, setChartData] = useState({});
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast({ key: msg, msg });
    window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    if (!token) return;
    api.get(`/admin/dashboard?range=${encodeURIComponent(dateRange)}`, token)
      .then((d) => {
        setKpis(d.kpis || []);
        setDepartmentData(d.departments || []);
        setOrderRows(d.orders || []);
        setLowStock(d.lowStock || []);
        setChartData(d.chart || {});
      })
      .catch(() => {});
  }, [token, dateRange]);

  const dots = chartMode === "revenue";
  const chartSeries = dots ? (chartData.series || []) : (chartData.ordersSeries || []);
  const chartPoints = chartSeries[0]?.points || [];

  const visibleOrders = orderRows.filter((row) => {
    const matchesTab = orderTab === "all" || row.status === orderTab;
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      String(row.id || "").toLowerCase().includes(q) ||
      String(row.name || "").toLowerCase().includes(q) ||
      String(row.email || "").toLowerCase().includes(q) ||
      String(row.item || "").toLowerCase().includes(q) ||
      String(row.payment || "").toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = visibleOrders.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const shippedCount = orderRows.filter((r) => r.shipped).length;
  const pendingCount = orderRows.filter((r) => r.status === "unfulfilled" && !r.shipped).length;
  const orderTabs = [
    ["all", `All Orders`],
    ["unfulfilled", `Awaiting Fulfillment (${pendingCount})`],
    ["shipped", `Shipped (${shippedCount})`],
    [null, `Stripe Processing (0)`],
  ];

  const urgentLowStock = lowStock.filter((i) => i.urgent).length;

  const revKpi = kpis.find((k) => k.label === "Gross Revenue");
  const ordersKpi = kpis.find((k) => k.label === "Total Orders");
  const aovKpi = kpis.find((k) => k.label === "Average Order Value");
  const latestOrder = orderRows[0];

  const kpiBarRatio = (kpi) => {
    const m = String(kpi.note || "").match(/(\d+)\s*fulfilled\s*•\s*(\d+)\s*pending/i);
    if (!m) return null;
    const total = Number(m[1]) + Number(m[2]);
    if (!total) return null;
    return (Number(m[1]) / total) * 100;
  };

  const deptSum = departmentData.reduce((sum, d) => {
    const num = Number(String(d.value || "0").replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
  const deptTotal =
    deptSum > 1000
      ? `$${(deptSum / 1000).toFixed(1)}k`
      : `$${deptSum > 0 ? deptSum.toFixed(0) : "48.9"}k`;

  const deptHex = {
    "bg-primary-container": "#4a705e",
    "bg-secondary-fixed-dim": "#94d4ba",
    "bg-tertiary-container": "#5d6b64",
    "bg-secondary-fixed": "#aff0d6",
    "bg-primary-fixed": "#c2ecd6",
  };

  const donutSegments = departmentData.map((d) => {
    const num = Number(String(d.value || "0").replace(/[^0-9.-]/g, ""));
    const rawPct = deptSum > 0 && Number.isFinite(num) ? (num / deptSum) * 100 : 0;
    return {
      label: d.label,
      pct: rawPct,
      color: deptHex[d.color] || "#e7e8e6",
    };
  });

  const CIRC = 2 * Math.PI * 40;

  const donutCircles = donutSegments.reduce((out, seg) => {
    const offset = out.offset;
    const len = Math.max(0, (seg.pct / 100) * CIRC);
    out.circles.push(
      <circle
        key={seg.label}
        cx="50"
        cy="50"
        fill="transparent"
        r="40"
        stroke={seg.color}
        strokeDasharray={`${len} ${CIRC - len}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        strokeWidth="12"
      />
    );
    out.offset = offset + len;
    return out;
  }, { circles: [], offset: 0 }).circles;

  const chartW = 700;
  const chartH = 200;
  const buildChartPath = (points) => {
    if (!points || points.length === 0) return { line: "", area: "", dots: [] };
    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = max - min || 1;
    const stepX = points.length > 1 ? chartW / (points.length - 1) : 0;
    const coords = points.map((p, i) => ({
      x: Math.round(i * stepX),
      y: Math.round(chartH - 25 - ((p - min) / span) * (chartH - 60)),
    }));
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x},${c.y}`).join(" ");
    const area = `${line} L ${chartW},${chartH} L 0,${chartH} Z`;
    let peakIdx = 0;
    coords.forEach((c, i) => {
      if (points[i] > points[peakIdx]) peakIdx = i;
    });
    return { line, area, dots: coords, peak: points[peakIdx], peakIdx };
  };
  const chartShape = buildChartPath(chartPoints);
  const chartPeakLabel = dots
    ? `Peak revenue: $${Number(chartShape.peak || 0).toLocaleString("en-US")}`
    : `Peak day: ${chartShape.peak || 0} orders`;
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const exportOrders = () => {
    const header = ["Order ID", "Time", "Customer", "Email", "Items", "Total", "Payment", "Fulfillment", "Status"];
    const lines = orderRows.map((r) => [
      r.id || "",
      r.time || "",
      r.name || "",
      r.email || "",
      r.item || "",
      String(r.total || ""),
      r.payment || "",
      r.fulfilment?.text || "",
      r.status || "",
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "veasna-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncStripe = () => {
    api.get(`/admin/dashboard?range=${encodeURIComponent(dateRange)}`, token)
      .then((d) => {
        setKpis(d.kpis || []);
        setDepartmentData(d.departments || []);
        setOrderRows(d.orders || []);
        setLowStock(d.lowStock || []);
        showToast("Stripe data & operational metrics synchronized");
      })
      .catch(() => showToast("Failed to sync Stripe"));
  };

  const fulfillOrder = (rawId) => {
    const raw = String(rawId).replace(/^#/, "");
    api.patch(`/admin/orders/${raw}/fulfil`, {}, token)
      .then(() => {
        showToast(`Order ${rawId} fulfilled`);
        api.get(`/admin/dashboard?range=${encodeURIComponent(dateRange)}`, token)
          .then((d) => {
            setKpis(d.kpis || []);
            setOrderRows(d.orders || []);
          })
          .catch(() => {});
      })
      .catch(() => showToast("Failed to fulfill order"));
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Toast Notification */}
      {toast && (
        <div key={toast.key} className="fixed bottom-6 right-6 z-50 px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface shadow-2xl flex items-center gap-space-sm animate-fade-in">
          <Icon name="check_circle" className="text-secondary-fixed text-[20px]" />
          <span className="font-label-md text-label-md font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Command bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Operational Overview</span>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold ml-2">Live Node</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">Welcome back, {(user?.name || "Admin").split(" ")[0]}. Here is your daily store performance and pending tasks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="relative inline-block text-left">
            <button
              className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container-lowest shadow-sm text-on-surface hover:bg-surface-container-low transition-all font-label-md text-label-md"
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <Icon name="calendar_today" className="text-[18px] text-tertiary" />
              <span className="font-medium">{dateRange}</span>
              <Icon name="expand_more" className="text-[16px] text-on-surface-variant" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-container-lowest shadow-xl z-20 py-1.5">
                {["Today", "Last 7 Days", "Last 30 Days", "Year to Date (YTD)"].map((range) => (
                  <button
                    key={range}
                    className={`w-full text-left px-space-md py-2 text-on-surface hover:bg-surface-container-low font-body-sm text-body-sm ${dateRange === range ? "font-medium bg-surface-container" : ""}`}
                    type="button"
                    onClick={() => {
                      setDateRange(range);
                      setDropdownOpen(false);
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container-lowest shadow-sm text-on-surface hover:bg-surface-container-low transition-all font-label-md text-label-md" type="button" onClick={syncStripe}>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <Icon name="sync" className="text-[18px] text-primary" />
            <span className="font-medium">Sync Stripe</span>
          </button>
          <button className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-primary text-on-primary shadow-sm hover:bg-primary-container transition-all font-label-md text-label-md font-medium" type="button" onClick={exportOrders}>
            <Icon name="download" className="text-[18px]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-lg mb-space-xl">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{kpi.label}</span>
                <div className="font-display-hero text-headline-lg font-bold text-on-surface mt-1">{kpi.value}</div>
              </div>
              <div className={`p-2 rounded-xl ${kpi.iconCls} flex items-center justify-center`}>
                <Icon name={kpi.icon} className="text-[20px]" />
              </div>
            </div>
            <div className="mt-space-md">
              {kpi.spark && (
                <div className="h-10 w-full mb-space-xs">
                  <svg className="w-full h-full text-secondary" fill="none" preserveAspectRatio="none" viewBox="0 0 160 40">
                    <path d={kpi.spark} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                    <path d={`${kpi.spark} L 160 40 L 0 40 Z`} fill="currentColor" fillOpacity="0.08" />
                  </svg>
                </div>
              )}
              {kpi.bar && (() => {
                const ratio = kpiBarRatio(kpi);
                if (ratio === null) return null;
                return (
                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden flex mb-2">
                    <div className="bg-secondary h-full rounded-full" style={{ width: `${ratio}%` }} />
                    <div className="bg-outline-variant h-full rounded-full ml-1" style={{ width: `${100 - ratio}%` }} />
                  </div>
                );
              })()}
              {kpi.action && (
                <div className="flex items-center gap-space-xs">
                  <span className="px-2.5 py-1 rounded-md bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold flex items-center gap-1">
                    <Icon name="priority_high" className="text-[14px]" />
                    {urgentLowStock > 0 ? `${urgentLowStock} Critical` : "Critical Items"}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium">
                    {lowStock.length} SKUs to review
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between font-body-sm text-body-sm mt-1">
                {kpi.change && (
                  <span className="inline-flex items-center text-secondary font-medium font-label-sm">
                    <Icon name="trending_up" className="text-[16px] mr-0.5" />
                    {kpi.change}
                  </span>
                )}
                <span className="text-on-surface-variant text-[11px] font-medium truncate ml-2">{kpi.note}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-xl">
        <div className="lg:col-span-8 bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
            <div>
              <div className="font-title-md text-title-md font-bold text-on-surface">Revenue &amp; Order Volume Trend</div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Daily gross sales recorded across Stripe webhook triggers</p>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-surface-container-low self-start sm:self-auto">
              <button
                className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${dots ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant hover:text-on-surface font-medium"}`}
                type="button"
                onClick={() => setChartMode("revenue")}
              >
                Revenue ($)
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${!dots ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant hover:text-on-surface font-medium"}`}
                type="button"
                onClick={() => setChartMode("orders")}
              >
                Orders (Count)
              </button>
            </div>
          </div>
          <div className="relative w-full h-64 mt-2 flex flex-col justify-end">
            {chartShape.dots.length > 0 ? (
              <>
                <svg className="w-full h-52 overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 200">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#4a705e" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#4a705e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line stroke="#edeeec" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="700" y1="40" y2="40" />
                  <line stroke="#edeeec" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="700" y1="90" y2="90" />
                  <line stroke="#edeeec" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="700" y1="140" y2="140" />
                  <path d={chartShape.area} fill="url(#chartGradient)" />
                  <path d={chartShape.line} fill="none" stroke={dots ? "#4a705e" : "#2a6954"} strokeLinecap="round" strokeWidth="3" />
                  {chartShape.dots.map((c, i) => (
                    <circle
                      key={i}
                      className="cursor-pointer hover:scale-125 transition-transform"
                      cx={c.x}
                      cy={c.y}
                      fill={i === chartShape.peakIdx ? "#325747" : "#4a705e"}
                      r={i === chartShape.peakIdx ? 6 : 5}
                      stroke={i === chartShape.peakIdx ? "#ffffff" : undefined}
                      strokeWidth={i === chartShape.peakIdx ? 2 : undefined}
                    />
                  ))}
                </svg>
                <div className="absolute right-4 top-2 bg-inverse-surface text-inverse-on-surface px-2.5 py-1 rounded-lg font-label-sm text-label-sm shadow-md flex items-center gap-1.5 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
                  <span>{chartPeakLabel}</span>
                </div>
                <div className="flex items-center justify-between pt-3 text-on-surface-variant font-label-sm text-label-sm">
                  {weekLabels.slice(0, chartShape.dots.length).map((day, i) => (
                    <span key={day} className={i === chartShape.dots.length - 1 ? "font-semibold text-primary" : ""}>{day}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-52 flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm">No revenue data recorded yet.</div>
            )}
          </div>
          <div className="mt-space-md pt-space-sm flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low/50 p-space-md rounded-xl">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-container" />
                <span className="font-label-sm text-label-sm text-on-surface">Current Cycle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-outline-variant" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">Prior Period Avg</span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface font-medium">
              <Icon name="verified_user" className="text-[18px] text-secondary" />
              <span>Stripe Webhook Sync: 100% Verified</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-title-md text-title-md font-bold text-on-surface">Sales by Department</h3>
              <button className="text-on-surface-variant hover:text-on-surface" type="button">
                <Icon name="more_horiz" className="text-[20px]" />
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Revenue split across current slow-living catalog</p>
            <div className="flex items-center justify-center py-space-sm">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {donutCircles.length > 0 ? (
                    donutCircles
                  ) : (
                    <circle cx="50" cy="50" fill="transparent" r="40" stroke="#edeeec" strokeDasharray={`${CIRC} ${CIRC}`} strokeWidth="12" />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">{deptTotal}</span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Total</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-space-sm mt-space-sm">
              {departmentData.length === 0 ? (
                <div className="flex items-center justify-center gap-2 p-space-md rounded-xl bg-surface-container-low/60 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="category" className="text-[18px]" />
                  <span>No department sales recorded yet.</span>
                </div>
              ) : (
                departmentData.map((dept) => (
                  <div key={dept.label} className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-space-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${dept.color}`} />
                      <span className="font-body-sm text-body-sm font-medium text-on-surface">{dept.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-label-md text-label-md font-bold text-on-surface">{dept.value}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-medium">{dept.pct}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="pt-space-md">
            <button className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md font-medium flex items-center justify-center gap-1" type="button" onClick={() => navigate("/admin/categories")}>
              <span>Explore Taxonomy Metrics</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden mb-space-xl">
        <div className="p-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-sm">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Operational Orders &amp; Fulfillment</h3>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm font-semibold text-on-surface-variant">Live Queue</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Real-time status of orders, Stripe transactions, and eco-packaging progress</p>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-2.5 text-on-surface-variant text-[18px]" />
              <input
                className="pl-9 pr-space-md py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-all w-64"
                placeholder="Search Order ID or Customer..."
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center p-1 rounded-xl bg-surface-container-low overflow-x-auto">
              {orderTabs.map(([key, label]) => (
                <button
                  key={key || "processing"}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${orderTab === key ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant hover:text-on-surface font-medium"}`}
                  type="button"
                  onClick={() => setOrderTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="py-3 px-space-lg font-semibold">Order ID</th>
                <th className="py-3 px-space-md font-semibold">Customer</th>
                <th className="py-3 px-space-md font-semibold">Items Purchased</th>
                <th className="py-3 px-space-md font-semibold">Payment</th>
                <th className="py-3 px-space-md font-semibold">Fulfillment</th>
                <th className="py-3 px-space-md font-semibold text-right">Total</th>
                <th className="py-3 px-space-lg font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
              {pageRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-space-lg">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-primary font-label-md">{row.id}</span>
                      {row.status === "unfulfilled" && row.action === "Fulfill" && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{row.time}</span>
                  </td>
                  <td className="py-4 px-space-md">
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-8 h-8 rounded-full ${row.initialsCls} flex items-center justify-center font-bold text-xs`}>{row.initials}</div>
                      <div>
                        <div className="font-medium text-on-surface">{row.name}</div>
                        <div className="text-on-surface-variant text-[11px]">{row.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-space-md max-w-xs">
                    <div className="font-medium truncate text-on-surface">{row.item}</div>
                    <div className="text-on-surface-variant text-[11px]">{row.sub}</div>
                  </td>
                  <td className="py-4 px-space-md">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed/60 text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                      <Icon name="check_circle" className="text-[14px]" />
                      <span>{row.payment}</span>
                    </div>
                  </td>
                  <td className="py-4 px-space-md">
                    <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${row.fulfilment.cls}`}>
                      {row.fulfilment.dot && <span className={`w-1.5 h-1.5 rounded-full ${row.fulfilment.dot}`} />}
                      {row.fulfilment.text}
                    </span>
                  </td>
                  <td className="py-4 px-space-md text-right font-semibold text-on-surface font-label-md">{row.total}</td>
                  <td className="py-4 px-space-lg text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.action ? (
                        <button
                          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary-container transition-all shadow-sm cursor-pointer"
                          type="button"
                          onClick={() => fulfillOrder(row.id)}
                        >
                          {row.action}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant font-label-sm text-label-sm">{row.shipped ? "Shipped" : "Archived"}</span>
                      )}
                      <button className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" type="button">
                        <Icon name="more_vert" className="text-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-14 text-center">
                    <Icon name="receipt_long" className="text-[36px] text-outline mx-auto mb-2" />
                    <p className="font-title-md text-title-md text-on-surface-variant">No orders found in this queue.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-space-md bg-surface-container-low/40 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
          <span>Showing <strong>{Math.min(PAGE_SIZE, visibleOrders.length)}</strong> of <strong>{visibleOrders.length}</strong> matching orders</span>
          <div className="flex items-center gap-space-xs">
            <button
              className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container font-medium shadow-sm transition-colors disabled:opacity-40"
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`px-3 py-1.5 rounded-lg font-semibold shadow-sm transition-colors ${
                  i === safePage ? "bg-primary text-on-primary" : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                }`}
                type="button"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container font-medium shadow-sm transition-colors disabled:opacity-40"
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Secondary widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon name="inventory" className="text-error text-[22px]" />
                <h3 className="font-title-md text-title-md font-bold text-on-surface">Low Stock Inventory Watch</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">Replenish Soon</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">SKUs falling beneath minimum threshold levels</p>
            <div className="flex flex-col gap-space-sm">
              {lowStock.length === 0 ? (
                <div className="p-space-md rounded-xl bg-surface-container-low/70 flex items-center justify-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="check_circle" className="text-[18px] text-secondary" />
                  <span>No low stock variants — inventory is healthy.</span>
                </div>
              ) : (
                lowStock.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low/70">
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          className="w-full h-full object-cover"
                          alt={item.name}
                          src={item.img || DEFAULT_PRODUCT_IMAGE}
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-label-md text-label-md font-semibold text-on-surface truncate">{item.name}</div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant truncate">{item.sku}</div>
                        {item.variant_name && item.variant_name !== item.name && (
                          <div className="font-label-sm text-label-sm text-on-surface-variant truncate">{item.variant_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm font-bold ${item.urgent ? "bg-error-container text-on-error-container animate-pulse" : "bg-error-container text-on-error-container"}`}>
                        {item.left} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-space-lg flex items-center justify-between gap-space-sm pt-space-xs">
            <button className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1" type="button" onClick={() => navigate("/admin/products")}>
              <span>Manage Supplier Catalogs</span>
              <Icon name="open_in_new" className="text-[16px]" />
            </button>
            <button className="px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-semibold shadow-sm flex items-center gap-1.5" type="button" onClick={() => navigate("/admin/products")}>
              <Icon name="add_shopping_cart" className="text-[18px]" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
                <h3 className="font-title-md text-title-md font-bold text-on-surface">Storefront Performance Pulse</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">Live from DB</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Key sales and fulfillment metrics from the live catalog</p>
            <div className="grid grid-cols-2 gap-space-md mb-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low/70">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <Icon name="payments" className="text-[18px] text-primary" />
                  <span>Gross Revenue</span>
                </div>
                <div className="font-display-hero text-headline-md font-bold text-on-surface mt-1">{revKpi?.value || "$0.00"}</div>
                <div className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">{ordersKpi?.note || "No orders yet"}</div>
              </div>
              <div className="p-space-md rounded-xl bg-surface-container-low/70">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <Icon name="local_mall" className="text-[18px] text-secondary" />
                  <span>Total Orders</span>
                </div>
                <div className="font-display-hero text-headline-md font-bold text-on-surface mt-1">{ordersKpi?.value || "0 Orders"}</div>
                <div className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">AOV {aovKpi?.value || "$0.00"}</div>
              </div>
            </div>
            <div className="p-space-md rounded-xl bg-surface-container-low/50 flex flex-col gap-2.5">
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Latest Order Activity</div>
              {latestOrder ? (
                <div className="flex items-center gap-space-sm">
                  <div className={`w-9 h-9 rounded-lg ${latestOrder.initialsCls} flex items-center justify-center font-bold text-xs shrink-0`}>{latestOrder.initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-label-md text-label-md font-semibold text-on-surface truncate">{latestOrder.name || latestOrder.id}</div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant truncate">{latestOrder.item} • {latestOrder.total}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium shrink-0 ${latestOrder.fulfilment.cls}`}>{latestOrder.fulfilment.text}</span>
                </div>
              ) : (
                <div className="font-body-sm text-body-sm text-on-surface-variant">No orders recorded yet.</div>
              )}
            </div>
          </div>
          <div className="mt-space-lg flex items-center justify-between pt-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <Icon name="bolt" className="text-[16px] text-secondary" />
              <span>{pendingCount} order{pendingCount === 1 ? "" : "s"} awaiting fulfillment</span>
            </span>
            <button className="px-space-md py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-all font-label-md text-label-md font-medium flex items-center gap-1" type="button" onClick={() => navigate("/admin/orders")}>
              <span>Review Orders</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}