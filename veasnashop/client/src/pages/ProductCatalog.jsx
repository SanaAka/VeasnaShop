import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Best Rated" },
];

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

export default function ProductCatalog() {
  const { addItem } = useCart();
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const activeSearch = searchParams.get("search")?.toLowerCase() || "";
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(200);
  const [toast, setToast] = useState(null);
  const toastTick = useRef(0);
  const [allProducts, setAllProducts] = useState([]);
  const [wishlist, setWishlist] = useState({});
  const [catCounts, setCatCounts] = useState({});
  const [catFilters, setCatFilters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories").then((d) => {
      const counts = {};
      const filters = [];
      (d.categories || []).forEach((c) => {
        counts[c.slug] = Number(c.count) + (c.children || []).reduce((s, ch) => s + (Number(ch.items) || 0), 0);
        filters.push({ key: c.slug, label: c.name });
      });
      setCatCounts(counts);
      setCatFilters(filters);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (activeSearch) params.set("search", activeSearch);
    if (sort) params.set("sort", sort);
    if (maxPrice < 200) params.set("maxPrice", maxPrice);
    const qs = params.toString();
    api.get(`/products${qs ? `?${qs}` : ""}`)
      .then((d) => setAllProducts((d.products || []).map((p) => ({ ...p, price: Number(p.price), originalPrice: Number(p.originalPrice || 0) }))))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (token) {
      api.get("/me/wishlist", token).then((d) => {
        const map = {};
        (d.items || []).forEach((i) => { map[i.id] = true; });
        setWishlist(map);
      }).catch(() => {});
    }
  }, [activeCategory, activeSearch, sort, maxPrice, token]);

  const toggleWishlist = (p) => {
    if (!token) {
      showToast("Sign in to save items to your wishlist");
      return;
    }
    const isWished = wishlist[p.id];
    setWishlist((w) => ({ ...w, [p.id]: !isWished }));
    if (isWished) {
      api.del(`/me/wishlist/${p.id}`, token).catch(() => {});
    } else {
      api.post("/me/wishlist", { productId: p.id }, token).catch(() => {});
    }
  };

  const filtered = useMemo(() => {
    let list = allProducts;
    if (maxPrice < 200) list = list.filter((p) => p.price <= maxPrice);
    return list;
  }, [allProducts, maxPrice]);

  const setCategory = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("category");
    else next.set("category", key);
    setSearchParams(next, { replace: true });
  };

  const showToast = (msg) => {
    toastTick.current += 1;
    setToast({ key: toastTick.current, text: msg });
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleAddToBag = (p) => {
    addItem({
      productId: p.id,
      variantId: 0,
      name: p.name,
      category: p.category || "",
      price: Number(p.price),
      qty: 1,
      variant: p.color || "Standard",
      size: "",
      sku: p.sku || "",
      tag: p.tag || "",
      status: "In Stock",
      giftWrap: false,
      image: p.image || "",
    });
    showToast(`${p.name} added to bag`);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      {toast && (
        <div
          key={toast.key}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-primary text-on-primary px-5 py-3.5 rounded-xl shadow-xl"
        >
          <Icon name="check_circle" filled className="text-[20px] text-secondary-fixed" />
          <span className="font-label-md text-label-md font-semibold">{toast.text}</span>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant mb-2">
            <Link to="/" className="font-label-sm text-label-sm hover:text-primary transition-colors">
              Home
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-label-sm text-label-sm font-medium text-on-surface">
              {activeSearch ? "Search" : activeCategory !== "all" ? catFilters.find((c) => c.key === activeCategory)?.label || "Browse" : "Browse"}
            </span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {activeSearch ? `Results for "${activeSearch}"` : "All Products"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {activeSearch
              ? `Showing ${filtered.length} mindful essentials matching your search.`
              : "Consciously curated essentials for slower, intentional living."}
          </p>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <label className="flex items-center gap-2" htmlFor="catalog-sort">
            <span className="font-label-md text-label-md">Sort</span>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-surface-container-lowest text-on-surface font-label-md text-label-md px-4 py-2.5 rounded-xl ring-1 ring-outline-variant focus:ring-primary focus:outline-none cursor-pointer"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Filter sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-28 flex flex-col gap-6">
            <div>
              <h3 className="font-label-lg text-label-lg font-semibold text-on-surface mb-3">
                Category
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg font-label-md text-label-md transition-colors text-left ${
                    activeCategory === "all"
                      ? "bg-primary-container text-on-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span>All</span>
                  <span className="font-label-sm text-label-sm opacity-80">{allProducts.length}</span>
                </button>
                {catFilters.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg font-label-md text-label-md transition-colors text-left ${
                      activeCategory === cat.key
                        ? "bg-primary-container text-on-primary font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="font-label-sm text-label-sm opacity-80">{catCounts[cat.key] || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-label-lg text-label-lg font-semibold text-on-surface mb-3">
                Max Price
              </h3>
              <input
                type="range"
                min={30}
                max={200}
                step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex items-center justify-between text-on-surface-variant mt-1">
                <span className="font-body-sm text-body-sm">$30</span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  Up to ${maxPrice}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex flex-col bg-surface-container-lowest rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="relative">
                  <Link to={`/products/${p.id}`} className="block relative w-full aspect-square rounded-xl overflow-hidden bg-surface-container mb-4">
                    <img
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      alt={p.name}
                      src={p.image || DEFAULT_PRODUCT_IMAGE}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                    {p.tag && (
                      <span className="absolute top-3 left-3 bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full font-semibold">
                        {p.tag}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    aria-label="Toggle Wishlist"
                    onClick={() => toggleWishlist(p)}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${
                      wishlist[p.id] ? "text-error" : "text-on-surface-variant hover:text-error"
                    }`}
                  >
                    <Icon name="favorite" filled={wishlist[p.id]} className="text-[18px]" />
                  </button>
                </div>
                <div className="px-2 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                        {p.category}
                      </span>
                      <div className="flex items-center gap-1 text-primary">
                        <Icon name="star" filled className="text-[14px]" />
                        <span className="font-label-sm text-label-sm font-semibold">{p.rating}</span>
                      </div>
                    </div>
                    <Link to={`/products/${p.id}`}>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium leading-snug hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                    </Link>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-title-md font-semibold text-primary">
                        ${p.price.toFixed(2)}
                      </span>
                      {p.originalPrice && (
                        <span className="font-body-sm text-body-sm text-outline line-through">
                          ${p.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddToBag(p)}
                      className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-surface-container border-t-primary animate-spin" />
              <p className="font-body-md text-body-md text-on-surface-variant mt-4">Loading mindful essentials…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Icon name="search_off" className="text-[40px] text-outline mx-auto mb-3" />
              <p className="font-title-md text-title-md text-on-surface-variant">
                No products match your filters.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}