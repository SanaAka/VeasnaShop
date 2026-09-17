import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

const nav = [
  { key: "overview", label: "Overview", icon: "grid_view" },
  { key: "orders", label: "My Orders", icon: "receipt_long" },
  { key: "wishlist", label: "Wishlist", icon: "favorite" },
  { key: "addresses", label: "Addresses", icon: "home" },
  { key: "rituals", label: "Ritual Profile", icon: "spa" },
  { key: "settings", label: "Settings", icon: "tune" },
];

const statusCls = {
  Fulfilled: "bg-secondary-fixed text-on-secondary-fixed-variant",
  Processing: "bg-surface-container-high text-on-surface",
  Paid: "bg-primary-fixed text-on-primary-fixed-variant",
  Shipped: "bg-tertiary-fixed text-on-tertiary-fixed",
  Cancelled: "bg-error-container text-on-error-container",
};

export default function UserDashboard() {
  const [active, setActive] = useState("overview");
  const { user, token, logout, refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [ritualDraft, setRitualDraft] = useState({});
  const [savingRitual, setSavingRitual] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [settingsDraft, setSettingsDraft] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressDraft, setAddressDraft] = useState({ label: "Home", line1: "", line2: "", city: "", state: "", zip: "", country: "US", is_default: false });
  const [savingAddress, setSavingAddress] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast({ key: msg, msg });
    window.setTimeout(() => setToast(null), 2600);
  };

  const inspectOrder = (orderId) => {
    const rawId = String(orderId).replace(/^#/, "");
    setLoadingOrderDetail(true);
    api.get(`/orders/${rawId}`, token)
      .then((d) => {
        setSelectedOrderDetail(d.order || null);
      })
      .catch(() => showToast(`Failed to load details for order ${orderId}`))
      .finally(() => setLoadingOrderDetail(false));
  };

  useEffect(() => {
    if (!token) return;
    api.get("/orders", token).then((d) => setOrders(d.orders || [])).catch(() => {});
    api.get("/me/dashboard", token).then((d) => setDashboard(d)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || active !== "wishlist") return;
    api.get("/me/wishlist", token).then((d) => setWishlist(d.items || [])).catch(() => {});
  }, [token, active]);

  useEffect(() => {
    if (!token || active !== "addresses") return;
    api.get("/me/addresses", token).then((d) => {
      const list = Array.isArray(d) ? d : d.addresses || (d.id ? [d] : []);
      setAddresses(list);
    }).catch(() => {});
  }, [token, active]);

  useEffect(() => {
    if (!token || active !== "rituals") return;
    api.get("/me/rituals", token).then((d) => {
      setRitualDraft({
        skin_type: d.skin_type || "",
        scent_preferences: d.scent_preferences || "",
        material_preferences: d.material_preferences || "",
        size_preference: d.size_preference || "",
        lifestyle_notes: d.lifestyle_notes || "",
      });
    }).catch(() => {});
  }, [token, active]);

  const removeWishlistItem = (productId) => {
    api.del(`/me/wishlist/${productId}`, token)
      .then(() => setWishlist((prev) => prev.filter((i) => i.id !== productId)))
      .catch(() => {});
  };

  const saveRituals = () => {
    setSavingRitual(true);
    api.post("/me/rituals", ritualDraft, token)
      .then(() => { setSaveMsg("Profile saved"); setTimeout(() => setSaveMsg(""), 2000); })
      .catch(() => { setSaveMsg("Failed to save"); setTimeout(() => setSaveMsg(""), 2000); })
      .finally(() => setSavingRitual(false));
  };

  const deleteAddress = (addressId) => {
    api.del(`/me/addresses/${addressId}`, token)
      .then(() => setAddresses((prev) => prev.filter((a) => a.id !== addressId)))
      .catch(() => {});
  };

  const saveAddress = () => {
    if (!addressDraft.line1 || !addressDraft.city || !addressDraft.state || !addressDraft.zip) return;
    setSavingAddress(true);
    api.post("/me/addresses", addressDraft, token)
      .then((res) => {
        setAddresses((prev) => [...prev, res.address || addressDraft]);
        setShowAddressForm(false);
        setAddressDraft({ label: "Home", line1: "", line2: "", city: "", state: "", zip: "", country: "US", is_default: false });
      })
      .catch(() => {})
      .finally(() => setSavingAddress(false));
  };

  const saveSettings = () => {
    setSavingSettings(true);
    const body = {};
    if (settingsDraft.name !== undefined) body.name = settingsDraft.name;
    if (settingsDraft.email !== undefined) body.email = settingsDraft.email;
    api.patch("/me/settings", body, token)
      .then(() => {
        if (refreshUser) refreshUser();
        setSettingsMsg("Profile updated");
        setTimeout(() => setSettingsMsg(""), 2000);
      })
      .catch(() => { setSettingsMsg("Failed to update"); setTimeout(() => setSettingsMsg(""), 2000); })
      .finally(() => setSavingSettings(false));
  };

  const resetPassword = () => {
    if (!newPassword) return;
    setSavingSettings(true);
    api.patch("/me/settings", { password: newPassword }, token)
      .then(() => { setNewPassword(""); setSettingsMsg("Password updated"); setTimeout(() => setSettingsMsg(""), 2000); })
      .catch(() => { setSettingsMsg("Failed to update password"); setTimeout(() => setSettingsMsg(""), 2000); })
      .finally(() => setSavingSettings(false));
  };

  const displayName = user?.name || "Guest";

  if (!token) return <Navigate to="/login" replace />;

  const renderContent = () => {
    if (active === "orders") {
      return (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => inspectOrder(order.id)}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer border border-transparent hover:border-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                  <Icon name="local_shipping" className="text-primary text-[24px]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-on-surface font-mono">{order.id}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{order.date} • {order.items} item{order.items > 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${statusCls[order.status] || "bg-surface-container text-on-surface"}`}>
                  {order.status}
                </span>
                <span className="font-title-md text-title-md font-bold text-primary">${Number(order.total).toFixed(2)}</span>
                <button
                  className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary font-label-sm text-label-sm font-medium transition-colors flex items-center gap-1"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inspectOrder(order.id);
                  }}
                >
                  <span>Track &amp; View</span>
                  <Icon name="chevron_right" className="text-[16px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (active === "wishlist") {
      if (wishlist.length === 0) {
        return (
          <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-sm">
            <Icon name="favorite" className="text-[44px] text-primary mx-auto mb-4" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">Your ritual wishlist is peaceful</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">Saved items will appear here for effortless mindful re-orders.</p>
            <Link to="/browse" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-all">
              Explore Catalog
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => (
            <div key={item.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface-container">
                <img
                  className="w-full h-full object-cover"
                  alt={item.name}
                  src={item.image || DEFAULT_PRODUCT_IMAGE}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                  }}
                />
                <button type="button" onClick={() => removeWishlistItem(item.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-container-lowest/80 flex items-center justify-center text-error hover:bg-error-container transition-colors">
                  <Icon name="favorite" filled className="text-[18px]" />
                </button>
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">{item.category}</span>
                <span className="font-title-md text-title-md font-semibold text-on-surface mt-1">{item.name}</span>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-container">
                  <span className="font-title-md text-title-md font-bold text-primary">${Number(item.price).toFixed(2)}</span>
                  <span className="font-label-sm text-label-sm text-secondary font-medium">{item.status || "In Stock"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (active === "addresses") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-title-md text-title-md font-semibold text-on-surface">Saved Addresses</h3>
            <button
              type="button"
              onClick={() => setShowAddressForm((v) => !v)}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-all flex items-center gap-1.5"
            >
              <Icon name={showAddressForm ? "close" : "add"} className="text-[18px]" />
              {showAddressForm ? "Cancel" : "Add New Address"}
            </button>
          </div>

          {showAddressForm && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col gap-4">
              <h4 className="font-title-sm text-title-sm font-semibold text-on-surface">New Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Label</span>
                  <input
                    value={addressDraft.label}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="e.g. Home, Office"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Address Line 1 *</span>
                  <input
                    value={addressDraft.line1}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, line1: e.target.value }))}
                    placeholder="123 Main St"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">Address Line 2</span>
                  <input
                    value={addressDraft.line2}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, line2: e.target.value }))}
                    placeholder="Apt 4B"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">City *</span>
                  <input
                    value={addressDraft.city}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                    placeholder="New York"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">State *</span>
                  <input
                    value={addressDraft.state}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))}
                    placeholder="NY"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface">ZIP Code *</span>
                  <input
                    value={addressDraft.zip}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, zip: e.target.value }))}
                    placeholder="10001"
                    className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={saveAddress}
                disabled={savingAddress}
                className="self-start px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:bg-primary-container transition-all disabled:opacity-60"
              >
                {savingAddress ? "Saving..." : "Save Address"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.length === 0 && !showAddressForm && (
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm text-center col-span-2">
                <Icon name="home" className="text-[36px] text-primary mx-auto mb-3" />
                <p className="font-body-md text-body-md text-on-surface-variant">No saved addresses yet.</p>
              </div>
            )}
            {addresses.map((addr) => (
              <div key={addr.id || addr.label} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{addr.label || "Address"}</span>
                  {addr.is_default && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">Primary</span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}, {addr.state} {addr.zip}<br />{addr.country || "US"}
                </p>
                <button type="button" onClick={() => deleteAddress(addr.id)} className="mt-4 font-label-sm text-label-sm text-error font-semibold hover:underline flex items-center gap-1">
                  <Icon name="delete" className="text-[16px]" />
                  Remove Address
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (active === "rituals") {
      return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-secondary-fixed/40 text-primary shrink-0">
              <Icon name="spa" className="text-[26px]" />
            </div>
            <div>
              <h3 className="font-title-md text-title-md font-semibold text-on-surface">Your Ritual Profile</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Tell us how you live so we can refine your recommendations.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">Skin Type</span>
              <input
                value={ritualDraft.skin_type || ""}
                onChange={(e) => setRitualDraft((d) => ({ ...d, skin_type: e.target.value }))}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                placeholder="e.g. Normal, Dry, Combination"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">Scent Preferences</span>
              <input
                value={ritualDraft.scent_preferences || ""}
                onChange={(e) => setRitualDraft((d) => ({ ...d, scent_preferences: e.target.value }))}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                placeholder="e.g. woody, earthy, fresh"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">Material Preferences</span>
              <input
                value={ritualDraft.material_preferences || ""}
                onChange={(e) => setRitualDraft((d) => ({ ...d, material_preferences: e.target.value }))}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                placeholder="e.g. organic linen, raw cotton"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">Size Preference</span>
              <input
                value={ritualDraft.size_preference || ""}
                onChange={(e) => setRitualDraft((d) => ({ ...d, size_preference: e.target.value }))}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                placeholder="e.g. M / L"
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">Lifestyle Notes</span>
              <textarea
                value={ritualDraft.lifestyle_notes || ""}
                onChange={(e) => setRitualDraft((d) => ({ ...d, lifestyle_notes: e.target.value }))}
                rows={3}
                className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface resize-none"
                placeholder="Anything else we should know?"
              />
            </label>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <button
              type="button"
              onClick={saveRituals}
              disabled={savingRitual}
              className="px-6 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold shadow-md hover:bg-primary-container transition-all disabled:opacity-60"
            >
              {savingRitual ? "Saving..." : "Save Profile"}
            </button>
            {saveMsg && <span className="font-label-sm text-label-sm text-primary font-semibold">{saveMsg}</span>}
          </div>
        </div>
      );
    }

    if (active === "settings") {
      return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-5 max-w-xl">
          <div>
            <h3 className="font-title-md text-title-md font-semibold text-on-surface mb-1">Profile Details</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Update your account information</p>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Name</span>
                <input
                  value={settingsDraft.name ?? user?.name ?? ""}
                  onChange={(e) => setSettingsDraft((d) => ({ ...d, name: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">Email</span>
                <input
                  type="email"
                  value={settingsDraft.email ?? user?.email ?? ""}
                  onChange={(e) => setSettingsDraft((d) => ({ ...d, email: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                />
              </label>
              <button
                type="button"
                onClick={saveSettings}
                disabled={savingSettings}
                className="self-start px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold shadow-md hover:bg-primary-container transition-all disabled:opacity-60"
              >
                {savingSettings ? "Saving..." : "Save Changes"}
              </button>
              {settingsMsg && <span className="font-label-sm text-label-sm text-primary font-semibold">{settingsMsg}</span>}
            </div>
          </div>
          <div>
            <h3 className="font-title-md text-title-md font-semibold text-on-surface mb-1">Change Password</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Use a strong password you don't use elsewhere</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
              />
              <button
                type="button"
                onClick={resetPassword}
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Icon name="lock_reset" className="text-[18px]" />
                Update Password
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(dashboard?.stats || [
            { label: "Total Spend", value: "$0.00", icon: "payments", note: "Across 0 mindful orders" },
            { label: "Orders Placed", value: "0", icon: "receipt_long", note: "0 in transit • 0 delivered" },
            { label: "Eco Impact", value: "0kg", icon: "eco", note: "CO₂ offset this year" },
          ]).map((stat) => (
            <div key={stat.label} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{stat.label}</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface mt-1">{stat.value}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">{stat.note}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-center">
                <Icon name={stat.icon} className="text-primary text-[22px]" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Recent Orders</h3>
            <button className="font-label-sm text-label-sm text-primary font-semibold hover:underline" type="button" onClick={() => setActive("orders")}>
              View all
            </button>
          </div>
          <div className="border-t border-surface-container divide-y divide-surface-container">
            {(dashboard?.recentOrders || orders.slice(0, 3)).map((order) => (
              <div
                key={order.id}
                onClick={() => inspectOrder(order.id)}
                className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-surface-container-low/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <Icon name="receipt_long" className="text-primary text-[20px]" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface font-mono">{order.id}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{order.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${statusCls[order.status] || "bg-surface-container"}`}>{order.status}</span>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary shrink-0">
              <Icon name="handshake" className="text-[24px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md font-semibold text-on-surface">Inner Circle Member</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Seasonal capsule early access unlocked</span>
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:bg-primary-container transition-all" type="button">
            Browse Early Access
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      <div className="flex flex-col w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Welcome back, {displayName.split(" ")[0]}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Your sanctuary, orders, and rituals — all in one calm place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              showToast("Signed out");
            }}
            className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold hover:bg-error-container hover:text-error transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
          >
            <Icon name="logout" className="text-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-3">
            <div className="sticky top-28 flex flex-col gap-5">
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Icon name="person" className="text-on-primary text-[24px]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg font-semibold text-on-surface truncate">{displayName}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{user?.email || ""}</span>
                </div>
              </div>
              <nav className="bg-surface-container-lowest rounded-2xl p-2 shadow-sm flex flex-col gap-1">
                {nav.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-label-md text-label-md transition-all text-left ${
                      active === item.key
                        ? "bg-primary-container text-on-primary font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <Icon name={item.icon} className="text-[20px]" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-9 flex flex-col gap-6">{renderContent()}</div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div key={toast.key} className="fixed bottom-6 right-6 z-50 px-space-md py-space-sm rounded-xl bg-inverse-surface text-inverse-on-surface shadow-2xl flex items-center gap-space-sm animate-fade-in">
          <Icon name="check_circle" className="text-secondary-fixed text-[20px]" />
          <span className="font-label-md text-label-md font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Order Inspection Modal */}
      {(selectedOrderDetail || loadingOrderDetail) && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5 border border-surface-container">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface font-mono">
                    {selectedOrderDetail?.id || "Order Details"}
                  </h2>
                  {selectedOrderDetail?.status && (
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${statusCls[selectedOrderDetail.status] || "bg-surface-container"}`}>
                      {selectedOrderDetail.status}
                    </span>
                  )}
                </div>
                {selectedOrderDetail?.date && (
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Placed on {selectedOrderDetail.date}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {loadingOrderDetail ? (
              <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
                <Icon name="sync" className="text-[28px] animate-spin text-primary" />
                <span className="font-body-sm text-body-sm">Loading order manifest...</span>
              </div>
            ) : selectedOrderDetail && (
              <div className="flex flex-col gap-5">
                {/* Fulfillment Status Timeline */}
                <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">Package Tracking & Status</span>
                  <div className="flex items-center justify-between text-body-sm font-medium pt-1">
                    <span className="text-on-surface flex items-center gap-1.5">
                      <Icon name="local_shipping" className="text-primary text-[18px]" />
                      Carrier: {selectedOrderDetail.tracking?.carrier || "Standard Eco-Express"}
                    </span>
                    <span className="font-mono text-on-surface-variant">
                      {selectedOrderDetail.tracking?.number ? `Tracking #: ${selectedOrderDetail.tracking.number}` : "Track ID: VSN-PK-TRK"}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex flex-col gap-3">
                  <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">Purchased Items</span>
                  <div className="flex flex-col divide-y divide-surface-container border border-surface-container rounded-xl overflow-hidden">
                    {selectedOrderDetail.items?.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-surface-container-lowest">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                            <img
                              className="w-full h-full object-cover"
                              alt={item.name}
                              src={item.image || DEFAULT_PRODUCT_IMAGE}
                              onError={(e) => {
                                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <span className="font-title-sm text-title-sm font-semibold text-on-surface truncate">{item.name}</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{item.variant || "Standard"} • Qty: {item.qty}</span>
                          </div>
                        </div>
                        <span className="font-title-sm text-title-sm font-bold text-on-surface font-mono">${(Number(item.price) * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address & Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1 text-body-sm">
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">Shipping Destination</span>
                    <span className="font-medium text-on-surface">{selectedOrderDetail.addresses?.shipping?.line1}</span>
                    <span className="text-on-surface-variant">
                      {selectedOrderDetail.addresses?.shipping?.city}, {selectedOrderDetail.addresses?.shipping?.state} {selectedOrderDetail.addresses?.shipping?.zip}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1 text-body-sm">
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">Totals Breakdown</span>
                    <div className="flex justify-between text-on-surface-variant font-label-sm">
                      <span>Subtotal</span>
                      <span>${selectedOrderDetail.totals?.subtotal?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-on-surface-variant font-label-sm">
                      <span>Tax &amp; Shipping</span>
                      <span>${((selectedOrderDetail.totals?.shipping || 0) + (selectedOrderDetail.totals?.tax || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-on-surface pt-1 border-t border-surface-container">
                      <span>Total</span>
                      <span className="text-primary font-mono">${selectedOrderDetail.totals?.total?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}