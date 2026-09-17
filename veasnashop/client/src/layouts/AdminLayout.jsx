import { useState } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../AuthContext";

const operationsLinks = [
  { to: "/admin", label: "Dashboard", icon: "grid_view", end: true },
  { to: "/admin/products", label: "Products", icon: "inventory_2", badge: "SKU" },
  {
    to: "/admin/orders",
    label: "Orders & Fulfillment",
    icon: "local_shipping",
    badge: "Live",
  },
  { to: "/admin/categories", label: "Categories & Taxonomy", icon: "category" },
];

const channelLinks = [
  { to: "/", label: "Storefront Preview", icon: "storefront", external: true },
];

function SidebarLink({ to, label, icon, badge, end, external, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-space-sm px-space-md py-space-sm rounded-xl transition-all group ${
          isActive
            ? "bg-primary-container text-on-primary font-semibold shadow-[0_2px_6px_rgba(74,112,94,0.12)]"
            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        }`
      }
    >
      <Icon name={icon} className="text-[20px] transition-colors" />
      <span className="font-label-lg text-label-lg flex-1">{label}</span>
      {badge && (
        <span
          className={`font-label-sm text-label-sm px-space-xs py-0.5 font-medium ${
            badge === "Live"
              ? "rounded-full bg-secondary-fixed text-on-secondary-fixed-variant"
              : "rounded-md bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {badge}
        </span>
      )}
      {external && <Icon name="open_in_new" className="text-[16px] text-on-surface-variant" />}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="h-16 px-space-lg flex items-center justify-between bg-surface-container-lowest border-b border-surface-container-low lg:border-0">
            <div className="flex items-center gap-space-sm">
              <Icon name="spa" className="text-primary text-[28px]" />
              <div className="flex flex-col">
                <span className="font-title-md text-title-md font-bold text-on-surface leading-tight tracking-tight">
                  Veasna Shop
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  Management Console
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={closeMobile}
              className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container lg:hidden"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <div className="px-space-md py-space-sm">
            <div className="px-space-sm py-space-xs font-label-sm text-label-sm text-on-surface-variant tracking-wider uppercase font-semibold">
              Operations
            </div>
          </div>
          <nav className="flex flex-col gap-space-xs px-space-md">
            {operationsLinks.map((link) => (
              <SidebarLink key={link.label} {...link} onClick={closeMobile} />
            ))}
          </nav>
          <div className="px-space-md pt-space-lg pb-space-xs">
            <div className="px-space-sm py-space-xs font-label-sm text-label-sm text-on-surface-variant tracking-wider uppercase font-semibold">
              Channels &amp; System
            </div>
          </div>
          <nav className="flex flex-col gap-space-xs px-space-md">
            {channelLinks.map((link) => (
              <SidebarLink key={link.label} {...link} onClick={closeMobile} />
            ))}
          </nav>
        </div>

        <div className="p-space-md bg-surface-container-low/60 m-space-md rounded-xl flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-sm text-label-sm text-on-secondary-container font-medium">
              Store Online • Live API
            </span>
          </div>
          <div className="flex items-center justify-between pt-space-xs">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Icon name="person" className="text-on-primary text-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="font-label-md text-label-md font-semibold text-on-surface truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  Store Owner
                </p>
              </div>
            </div>
            <Link
              to="/"
              title="Back to Store"
              className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center justify-center"
            >
              <Icon name="logout" className="text-[20px]" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-space-md lg:px-space-lg flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container lg:hidden shrink-0"
              title="Open Navigation"
            >
              <Icon name="menu" className="text-[22px]" />
            </button>

            <div className="relative w-full flex items-center">
              <Icon
                name="search"
                className="absolute left-space-md text-on-surface-variant text-[20px] pointer-events-none"
              />
              <input
                className="w-full pl-10 pr-space-md py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-all"
                placeholder="Search orders, SKU, customers..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-space-sm lg:gap-space-md">
            <div className="hidden xl:flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
              <Icon name="calendar_today" className="text-[16px]" />
              <span>Last 30 Days</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Production Live</span>
            </div>
            <Link
              to="/admin/products"
              className="flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:bg-primary-container transition-all whitespace-nowrap"
            >
              <Icon name="add" className="text-[18px]" />
              <span className="hidden sm:inline">New Product</span>
            </Link>
          </div>
        </header>

        <main className="relative pt-16 bg-surface flex-1 w-full px-space-md lg:px-space-lg py-space-lg">
          <div className="flex flex-col w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}