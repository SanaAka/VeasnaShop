import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

const statChips = [
  { label: "Awaiting Fulfillment", value: "0", icon: "hourglass_top", cls: "text-error" },
  { label: "Shipped", value: "0", icon: "local_shipping", cls: "text-secondary" },
  { label: "In Packing Queue", value: "0", icon: "inventory_2", cls: "text-primary" },
  { label: "Returns Awaiting", value: "0", icon: "assignment_return", cls: "text-tertiary" },
];

export default function AdminOrders() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [fulfilmentRows, setFulfilmentRows] = useState([]);
  const [stats, setStats] = useState(statChips);
  const [toastTick, setToastTick] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(() => {
    if (!token) return;
    api.get("/admin/orders", token)
      .then((d) => {
        setFulfilmentRows(d.orders || []);
        setStats(d.stats || statChips);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [token, fetchOrders]);

  const visible = fulfilmentRows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      String(row.id || "").toLowerCase().includes(q) ||
      String(row.name || "").toLowerCase().includes(q) ||
      String(row.email || "").toLowerCase().includes(q) ||
      String(row.pid || "").toLowerCase().includes(q) ||
      String(row.loc || "").toLowerCase().includes(q) ||
      String(row.payment || "").toLowerCase().includes(q);
    let matchFilter = true;
    if (filter === "queue") matchFilter = row.fulfilment.text === "In Queue";
    if (filter === "packing") matchFilter = row.fulfilment.text === "Packing" || row.fulfilment.text === "Awaiting Label";
    if (filter === "shipped") matchFilter = row.fulfilment.text === "Shipped" || row.fulfilment.text === "Delivered";
    return matchSearch && matchFilter;
  });

  const showToast = (msg) => {
    setToastTick((t) => t + 1);
    setToast({ key: toastTick, msg });
    window.setTimeout(() => setToast(null), 2600);
  };

  const fulfilOrder = (orderId) => {
    const raw = String(orderId).replace(/^#/, "");
    api.patch(`/admin/orders/${raw}/fulfil`, {}, token)
      .then(() => {
        showToast(`Order ${orderId} fulfilled`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((o) => ({ ...o, fulfilment: { ...o.fulfilment, text: "Shipped", cls: "bg-surface-container-high text-on-surface" } }));
        }
      })
      .catch(() => showToast("Failed to fulfil order"));
  };

  const exportSheet = () => {
    const header = ["Order ID", "Customer", "Email", "Location", "Items", "Payment", "Stripe PID", "Fulfillment", "Total"];
    const lines = fulfilmentRows.map((r) => [
      r.id || "",
      r.name || "",
      r.email || "",
      r.loc || "",
      r.items || "",
      r.payment || "",
      r.pid || "",
      r.fulfilment?.text || "",
      r.total || "",
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "veasna-fulfillment.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full">
      {toast && (
        <div key={toast.key} className="fixed bottom-6 right-6 z-50 px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface shadow-2xl flex items-center gap-space-sm">
          <Icon name="check_circle" className="text-secondary-fixed text-[20px]" />
          <span className="font-label-md text-label-md font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Orders &amp; Fulfillment Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Monitor Stripe payments, eco-packaging, and shipping dispatch across the global queue
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button className="px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/60 hover:bg-surface-container-low transition-all font-label-md text-label-md flex items-center gap-space-xs cursor-pointer" type="button" onClick={exportSheet}>
            <Icon name="download" className="text-[18px] text-primary" />
            <span>Export Manifest</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg mb-space-lg">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{s.label}</span>
              <span className={`font-display-hero text-headline-md font-bold text-on-surface mt-1`}>{s.value}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-center">
              <Icon name={s.icon} className={`text-[22px] ${s.cls}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
        <div className="px-space-lg py-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low/40 border-b border-surface-container">
          <div className="relative flex-1 max-w-md w-full">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[19px]" />
            <input
              className="w-full pl-11 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-all"
              placeholder="Search Order ID, Customer, Stripe PID..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center p-1 rounded-xl bg-surface-container-low overflow-x-auto">
            {[["all", "All Orders"], ["queue", "In Queue"], ["packing", "Packing"], ["shipped", "Shipped"]].map(([key, label]) => (
              <button
                key={key}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all font-label-sm text-label-sm ${filter === key ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant hover:text-on-surface font-medium"}`}
                type="button"
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="py-space-md px-space-md">Order ID &amp; Date</th>
                <th className="py-space-md px-space-md">Customer</th>
                <th className="py-space-md px-space-md">Items</th>
                <th className="py-space-md px-space-md">Stripe Status</th>
                <th className="py-space-md px-space-md">Fulfillment</th>
                <th className="py-space-md px-space-md text-right">Total</th>
                <th className="py-space-md px-space-md text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {visible.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedOrder(row)}
                  className={`transition-colors cursor-pointer ${row.highlight ? "bg-primary-fixed/20 hover:bg-primary-fixed/30" : "hover:bg-surface-container-low"}`}
                >
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">{row.id}</span>
                        {row.tag && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm" title="Gift wrap requested">
                            <Icon name={row.tag.icon} className="text-[14px]" />
                            <span>{row.tag.label}</span>
                          </span>
                        )}
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{row.time}</span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-semibold text-on-surface">{row.name}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[130px]">{row.email}</span>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-on-surface-variant">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                        {row.loc}
                      </span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-space-xs">
                      <div className="relative flex -space-x-2 overflow-hidden">
                        {row.images.map((img, i) => (
                          <img
                            key={i}
                            className="inline-block h-9 w-9 rounded-lg object-cover ring-2 ring-surface-container-lowest"
                            alt=""
                            src={img || DEFAULT_PRODUCT_IMAGE}
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        ))}
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">{row.items} item{row.items > 1 ? "s" : ""}</span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm font-semibold">
                        <Icon name="check_circle" className="text-[16px]" />
                        <span>{row.payment}</span>
                      </span>
                      <span className="font-label-sm text-[11px] text-on-surface-variant font-mono truncate max-w-[110px]">{row.pid}</span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold ${row.fulfilment.cls}`}>
                      {row.fulfilment.dot && <span className={`w-1.5 h-1.5 rounded-full ${row.fulfilment.dot}`} />}
                      {row.fulfilment.text}
                    </span>
                  </td>
                  <td className="py-space-md px-space-md text-right font-label-lg text-label-lg font-bold text-on-surface">{row.total}</td>
                  <td className="py-space-md px-space-md text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      {row.fulfilment.text === "In Queue" && (
                        <button className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary-container transition-all cursor-pointer" type="button" onClick={() => fulfilOrder(row.id)}>
                          Fulfill
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button" onClick={() => setSelectedOrder(row)}>
                        <Icon name="visibility" className="text-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-20 text-center">
                    <Icon name="search_off" className="text-[36px] text-outline mx-auto mb-2" />
                    <p className="font-title-md text-title-md text-on-surface-variant">No orders match your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-space-md bg-surface-container-low/40 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
          <span>Showing <strong>{visible.length}</strong> of <strong>{fulfilmentRows.length}</strong> fulfillment orders</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Live Sync Healthy
          </span>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5 border border-surface-container">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Order Details</span>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{selectedOrder.id}</h2>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Customer & Payment Meta */}
            <div className="grid grid-cols-2 gap-4 bg-surface-container-low/60 p-4 rounded-xl">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold block mb-1">Customer</span>
                <p className="font-label-md text-label-md font-bold text-on-surface">{selectedOrder.name}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{selectedOrder.email}</p>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold block mb-1">Payment Method</span>
                <p className="font-label-md text-label-md font-bold text-secondary flex items-center gap-1">
                  <Icon name="check_circle" className="text-[16px]" />
                  {selectedOrder.payment}
                </p>
                <p className="font-mono text-[11px] text-on-surface-variant truncate">{selectedOrder.pid}</p>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between bg-surface-container-low p-4 rounded-xl">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block">Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold mt-1 ${selectedOrder.fulfilment?.cls}`}>
                  {selectedOrder.fulfilment?.text}
                </span>
              </div>
              {selectedOrder.fulfilment?.text === "In Queue" && (
                <button
                  type="button"
                  onClick={() => fulfilOrder(selectedOrder.id)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Icon name="local_shipping" className="text-[18px]" />
                  <span>Fulfill Order</span>
                </button>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-container font-title-md text-title-md font-bold text-on-surface">
              <span>Total Amount</span>
              <span className="text-primary">{selectedOrder.total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}