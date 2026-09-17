import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import Footer from "../components/Footer";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";

const navLinks = [
  { to: "/browse", label: "Browse", path: "browse" },
  { to: "/", label: "Journal", path: "journal" },
  { to: "/", label: "About", path: "about" },
];

export default function StorefrontLayout() {
  const { user, token, logout } = useAuth();
  const accountPath = token ? (user?.role === "admin" ? "/admin" : "/dashboard") : "/login";
  const nameParts = (user?.name || "").split(/\s+/).filter(Boolean);
  const initials = (nameParts[0]?.[0] || "") + (nameParts[1]?.[0] || "");

  const navigate = useNavigate();
  const { items } = useCart();
  const [query, setQuery] = useState("");
  const cartCount = items.reduce((n, it) => n + it.qty, 0);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/browse?search=${encodeURIComponent(query.trim())}` : "/browse");
  };

  const onChangeSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      navigate(`/browse?search=${encodeURIComponent(value.trim())}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <Icon name="spa" className="text-primary text-[28px]" />
            <span className="font-title-md text-title-md tracking-wider text-primary font-semibold group-hover:text-primary-container transition-colors">
              VEASNA
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.to}
                className={({ isActive }) =>
                  `transition-colors font-label-lg text-label-lg ${
                    isActive
                      ? "text-primary font-semibold"
                      : "text-on-surface-variant hover:text-primary"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 gap-2 text-on-surface-variant">
              <Icon name="search" className="text-[18px]" />
              <form onSubmit={onSearch} className="flex items-center">
                <input
                  className="bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none w-36 lg:w-44"
                  placeholder="Search botanicals, home..."
                  type="text"
                  value={query}
                  onChange={onChangeSearch}
                />
              </form>
            </div>
            {token ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to={accountPath}
                  aria-label={user?.role === "admin" ? "Admin" : "Dashboard"}
                  className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name={user?.role === "admin" ? "admin_panel_settings" : "dashboard"} className="text-[18px]" />
                  {user?.role === "admin" ? "Admin" : "Dashboard"}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  title="Sign Out"
                  className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                >
                  <Icon name="logout" className="text-[18px]" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                aria-label="Login"
                className="hidden md:flex items-center font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/cart"
              aria-label="Cart"
              className="relative flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
            >
              <Icon name="shopping_bag" className="text-[22px]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-on-primary font-label-sm text-label-sm rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to={accountPath}
              aria-label={token ? "Account" : "Login"}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary hover:bg-primary-container transition-colors"
            >
              {token && initials ? (
                <span className="font-label-sm text-label-sm font-bold">{initials}</span>
              ) : (
                <Icon name="person" className="text-[18px]" />
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20 w-full bg-surface">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}