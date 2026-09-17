import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";

const filters = [
  { key: "all", label: "All" },
  { key: "best-sellers", label: "Best Sellers" },
  { key: "new-arrivals", label: "New Arrivals" },
  { key: "sustainably-made", label: "Sustainably Made" },
];

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

const heroImage =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&auto=format&fit=crop&q=80";

const philosophyImage1 =
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop&q=80";

const philosophyImage2 =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80";

const trustBar = [
  { icon: "nest_eco_leaf", label: "Carbon Neutral Shipping" },
  { icon: "handshake", label: "Ethically Sourced" },
  { icon: "grass", label: "100% Organic Materials" },
  { icon: "recycling", label: "Zero Waste Packaging" },
];

export default function Home() {
  const { addItem } = useCart();
  const { token } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [wishlist, setWishlist] = useState({});
  const toastTick = useRef(0);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/products").then((d) => setProducts((d.products || []).map((p) => ({ ...p, price: Number(p.price), originalPrice: Number(p.originalPrice || 0) })))).catch(() => {});
    api.get("/categories").then((d) => {
      const cats = d.categories || [];
      const flat = [];
      for (const c of cats) {
        const childItems = (c.children || []).reduce((s, ch) => s + (Number(ch.items) || 0), 0);
        flat.push({ name: c.name, slug: c.slug, description: c.description, count: Number(c.count) + childItems, image: c.image });
      }
      setCategories(flat);
    }).catch(() => {});
    if (token) {
      api.get("/me/wishlist", token).then((d) => {
        const map = {};
        (d.items || []).forEach((i) => { map[i.id] = true; });
        setWishlist(map);
      }).catch(() => {});
    }
  }, [token]);

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

  const visibleProducts = products.filter(
    (p) => {
      if (activeFilter === "all") return true;
      const tag = (p.tag || "").toLowerCase();
      if (activeFilter === "best-sellers") return tag.includes("best") || p.rating >= 4.7;
      if (activeFilter === "new-arrivals") return tag.includes("new");
      if (activeFilter === "sustainably-made") return tag.includes("ustain") || tag.includes("organic") || tag.includes("eco");
      return true;
    }
  );

  const heroProduct =
    products.find((p) => (p.tag || "").toLowerCase().includes("best")) || products[0] || null;
  const avgRating = products.length
    ? (products.reduce((s, p) => s + Number(p.rating || 0), 0) / products.length).toFixed(2)
    : "4.9";
  const totalReviews = products.reduce((s, p) => s + (Number(p.reviews) || 0), 0);

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
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-primary text-on-primary px-5 py-3.5 rounded-xl shadow-xl animate-[toastIn_0.3s_ease-out]"
        >
          <Icon name="check_circle" filled className="text-[20px] text-secondary-fixed" />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-semibold">{toast.text}</span>
            <span className="font-body-sm text-body-sm text-surface-container-low opacity-90">
              Mindfully packaged for delivery
            </span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative w-full rounded-2xl bg-surface-container-low overflow-hidden mb-16 shadow-sm">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-primary-fixed-dim/15 blur-2xl pointer-events-none" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 lg:p-14 relative z-10">
          <div className="lg:col-span-7 flex flex-col items-start max-w-xl">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest text-primary mb-6 shadow-sm">
              <Icon name="eco" className="text-[16px] text-primary" />
              <span className="font-label-sm text-label-sm uppercase tracking-wider">
                Spring / Summer Studio Release
              </span>
            </div>
            <h1 className="font-display-hero text-display-hero text-on-surface mb-5">
              Consciously Crafted for{" "}
              <span className="text-primary italic">Mindful Living</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
              Handmade ceramics, organic linen apparel, and therapeutic botanical
              goods created in slow harmony with nature to cultivate everyday
              grounded calm.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-10 w-full sm:w-auto">
              <Link
                to="/browse"
                className="w-full sm:w-auto text-center px-7 py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container hover:shadow-lg transition-all duration-200"
              >
                Explore Catalog
              </Link>
              <a
                className="w-full sm:w-auto text-center px-6 py-3.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-all duration-200 flex items-center justify-center gap-2"
                href="#philosophy"
              >
                <span>Our Philosophy</span>
                <Icon name="arrow_forward" className="text-[18px]" />
              </a>
            </div>
            <div className="flex items-center gap-4 text-on-surface-variant">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm font-semibold text-primary">
                  V
                </div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-surface-container-highest flex items-center justify-center font-label-sm text-label-sm font-semibold text-tertiary">
                  M
                </div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-primary-fixed-dim flex items-center justify-center font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                  K
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-primary">
                  <Icon name="star" filled className="text-[16px]" />
                  <span className="font-label-md text-label-md font-semibold">{avgRating} / 5</span>
                </div>
                <span className="font-body-sm text-body-sm text-outline">
                  From over {totalReviews.toLocaleString()} verified reviews
                </span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/5] bg-surface-container">
              <img
                className="w-full h-full object-cover"
                alt={heroProduct ? heroProduct.name : "Mindful living still life"}
                src={heroProduct?.image || heroImage}
                onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                    {heroProduct ? (heroProduct.category || "Signature Studio").toUpperCase() : "Signature Studio"}
                  </span>
                  <span className="font-title-md text-title-md text-on-surface font-medium">
                    {heroProduct ? heroProduct.name : "Stone Milk Pourer"}
                  </span>
                </div>
                <span className="font-label-lg text-label-lg font-semibold text-primary">
                  ${(heroProduct ? Number(heroProduct.price) : 58).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex absolute -bottom-5 -left-6 bg-surface-container-lowest rounded-xl p-4 shadow-lg items-center gap-3 max-w-[210px]">
              <div className="w-10 h-10 rounded-lg bg-secondary-fixed/40 flex items-center justify-center text-primary flex-shrink-0">
                <Icon name="water_drop" className="text-[20px]" />
              </div>
              <span className="font-label-sm text-label-sm text-on-surface leading-tight font-medium">
                100% Non-toxic mineral glazes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="w-full bg-surface-container-lowest/80 backdrop-blur-sm px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {trustBar.map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-2 text-on-surface-variant">
              <Icon name={item.icon} className="text-primary text-[18px]" />
              <span className="font-label-sm text-label-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Curated Categories */}
      <section className="w-full mb-20 mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
              Curation
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Explore Categories</h2>
          </div>
          <Link
            to="/browse"
            className="font-label-lg text-label-lg text-primary hover:text-primary-container font-medium flex items-center gap-1 group"
          >
            <span>View all departments</span>
            <Icon name="arrow_forward" className="text-[18px] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/browse?category=${cat.slug}`}
              className="group flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="relative w-full aspect-square overflow-hidden bg-surface-container">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={cat.name}
                  src={cat.image || DEFAULT_PRODUCT_IMAGE}
                  onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                />
                <div className="absolute top-3 right-3 bg-surface-container-lowest/80 backdrop-blur-sm px-2.5 py-1 rounded-full font-label-sm text-label-sm text-on-surface font-medium">
                  {cat.count} Items
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    {cat.description}
                  </p>
                </div>
                <span className="font-label-sm text-label-sm text-primary font-semibold mt-4 flex items-center gap-1">
                  Shop Collection <Icon name="chevron_right" className="text-[14px]" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="w-full mb-20 scroll-mt-24" id="curated-products">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
              Mindful Objects
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Curated Essentials</h2>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
                  activeFilter === f.key
                    ? "bg-secondary-container text-on-secondary-container font-semibold shadow-xs"
                    : "bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleProducts.map((p) => (
            <div
              key={p.id}
              className="flex flex-col bg-surface-container-lowest rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300 relative group"
            >
              <Link to={`/products/${p.id}`} className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-container mb-4 block group-hover:scale-[1.02] transition-transform duration-300">
                <img
                  className="w-full h-full object-cover"
                  alt={p.name}
                  src={p.image || DEFAULT_PRODUCT_IMAGE}
                  onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                />
              </Link>
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 ml-3 mt-3">
                {p.tag && (
                  <span className="bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full font-semibold">
                    {p.tag}
                  </span>
                )}
              </div>
              <button
                aria-label="Add to Wishlist"
                type="button"
                onClick={() => toggleWishlist(p)}
                className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${
                  wishlist[p.id] ? "text-error" : "text-on-surface-variant hover:text-error"
                }`}
              >
                <Icon name="favorite" filled={wishlist[p.id]} className="text-[18px]" />
              </button>
              <div className="px-2 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
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
                  <span className="font-title-md text-title-md font-semibold text-primary">
                    ${p.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddToBag(p)}
                    className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-sm text-label-sm transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="keyboard_double_arrow_left" className="text-[16px]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sustainability Storytelling Strip */}
      <section
        className="w-full mb-20 bg-surface-container-low rounded-2xl p-8 lg:p-14 overflow-hidden relative shadow-sm"
        id="philosophy"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 flex flex-col items-start">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Icon name="spa" className="text-[20px]" />
              <span className="font-label-sm text-label-sm uppercase tracking-widest font-semibold">
                Origin &amp; Responsibility
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-5">
              Quiet luxury rooted in authentic community stewardship.
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Every object in Veasna is co-created with independent master potters,
              master weavers, and herb farms across Kyoto and Southeast Asia. We
              ensure non-exploitative fair living wages, closed-loop kiln firings,
              and certified low-impact natural dyes.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full pt-4">
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs">
                <span className="font-headline-md text-headline-md font-bold text-primary">100%</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">
                  Traceable raw ingredients
                </span>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs">
                <span className="font-headline-md text-headline-md font-bold text-primary">38+</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">
                  Multi-generational artisan families
                </span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden aspect-[4/5] bg-surface-container shadow-md">
              <img
                className="w-full h-full object-cover"
                alt="Artisan at wheel"
                src={philosophyImage1}
                onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
              />
            </div>
            <div className="rounded-xl overflow-hidden aspect-[4/5] bg-surface-container shadow-md sm:translate-y-6">
              <img
                className="w-full h-full object-cover"
                alt="Drying botanicals"
                src={philosophyImage2}
                onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="w-full mb-12">
        <div className="bg-surface-container-lowest rounded-2xl p-8 lg:p-12 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-secondary-container/40 flex items-center justify-center text-primary mb-6">
              <Icon name="format_quote" className="text-[24px]" />
            </div>
            <div className="flex items-center gap-1 text-primary mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="star" filled className="text-[18px]" />
              ))}
            </div>
            <blockquote className="font-headline-md text-headline-md text-on-surface font-normal italic leading-relaxed mb-6">
              “Veasna’s linen and ceramics transformed our home sanctuary into a
              tranquil retreat. The subtle tactile texture and natural scent
              palette are entirely unmatched.”
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-title-md text-title-md font-semibold text-primary">
                E
              </div>
              <div className="flex flex-col text-left">
                <span className="font-label-lg text-label-lg font-semibold text-on-surface">Elena R.</span>
                <span className="font-body-sm text-body-sm text-outline">
                  Verified Buyer &amp; Architect • Portland, OR
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}