import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop";

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { token } = useAuth();
  const [product, setProduct] = useState(null);
  const [pairingItems, setPairingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState("details");
  const [isWished, setIsWished] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [giftWrap, setGiftWrap] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/products/${id}/pairing`),
    ])
      .then(([pData, pairData]) => {
        const pr = pData.product;
        if (pr) {
          setProduct({
            ...pr,
            price: Number(pr.price),
            originalPrice: Number(pr.originalPrice || 0),
          });
          const opts = pr.variantOptions || {};
          const init = {};
          Object.keys(opts).forEach((t) => { if (opts[t]?.length) init[t] = opts[t][0]; });
          setSelectedVariants(init);
        }
        setPairingItems((pairData.items || []).map((p) => ({ ...p, price: Number(p.price), originalPrice: Number(p.originalPrice || 0) })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (token) {
      api.get("/me/wishlist", token).then((d) => {
        setIsWished((d.items || []).some((i) => String(i.id) === String(id)));
      }).catch(() => {});
    }
  }, [id, token]);

  const toggleWishlist = () => {
    if (!token) return;
    setIsWished((prev) => !prev);
    if (isWished) {
      api.del(`/me/wishlist/${id}`, token).catch(() => {});
    } else {
      api.post("/me/wishlist", { productId: Number(id) }, token).catch(() => {});
    }
  };

  const toggleAccordion = (key) =>
    setActiveAccordion((cur) => (cur === key ? null : key));

  const variantOptions = product?.variantOptions || {};
  const variantTypes = Object.keys(variantOptions);

  const selectedNames = Object.values(selectedVariants);
  const match = (product?.variants || []).find(
    (v) => selectedNames.length > 0 && selectedNames.every((name) => String(v.variant_name).toLowerCase() === String(name).toLowerCase())
  );
  const unitPrice = product ? Number(product.price) + (match ? Number(match.price_adjustment || 0) : 0) : 0;

  const addToBag = () => {
    const variantLabel = Object.values(selectedVariants).join(", ") || "Standard";
    addItem({
      productId: product.id,
      variantId: match ? Number(match.id) : 0,
      name: product.name,
      category: product.category || "",
      price: unitPrice,
      qty,
      variant: variantLabel,
      size: "",
      sku: match?.sku || product.sku || "",
      tag: product.tag || "",
      status: "In Stock",
      giftWrap,
      image: product.image || "",
    });
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2600);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 rounded-full border-2 border-surface-container border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 text-center">
        <p className="font-title-md text-title-md text-on-surface-variant">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      {showToast && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-primary text-on-primary px-5 py-3.5 rounded-xl shadow-xl">
          <Icon name="check_circle" filled className="text-[20px] text-secondary-fixed" />
          <span className="font-label-md text-label-md font-semibold">
            {product.name} added to bag
          </span>
        </div>
      )}

      <nav className="flex items-center gap-2 text-on-surface-variant mb-8">
        <Link to="/" className="font-label-sm text-label-sm hover:text-primary transition-colors">Home</Link>
        <Icon name="chevron_right" className="text-[14px]" />
        <Link to="/browse" className="font-label-sm text-label-sm hover:text-primary transition-colors">Shop</Link>
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-sm text-label-sm font-medium text-on-surface">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-surface-container shadow-sm">
            <img
              className="w-full h-full object-cover"
              alt={product.name}
              src={product.image || DEFAULT_PRODUCT_IMAGE}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
              }}
            />
            {product.tag && (
              <span className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm px-3 py-1.5 rounded-full font-semibold">
                {product.tag}
              </span>
            )}
            <button
              type="button"
              aria-label="Toggle Wishlist"
              onClick={toggleWishlist}
              className={`absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center transition-colors shadow-sm ${
                isWished ? "text-error" : "text-on-surface-variant hover:text-error"
              }`}
            >
              <Icon name="favorite" filled={isWished} className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* Product info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
              {product.category}
            </span>
            <span className="text-outline">•</span>
            <span className="font-label-sm text-label-sm">{product.reviews} reviews</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-3">{product.name}</h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 text-primary">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="star" filled className="text-[16px]" />
              ))}
              <span className="font-label-md text-label-md font-semibold ml-1">{product.rating}</span>
            </div>
            <span className="font-body-sm text-body-sm text-outline">({product.reviews})</span>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <span className="font-headline-sm text-headline-sm font-semibold text-primary">
              ${unitPrice.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="font-body-md text-body-md text-outline line-through mb-0.5">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">
            {product.description || "A quietly considered object for daily ritual. Muted reactive mineral glazes, slow-fired organic clay, and natural finishes chosen to patina beautifully with time."}
          </p>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-secondary-container bg-secondary-container/50 px-3 py-1.5 rounded-full font-medium">
              <Icon name="confirmation_number" className="text-[14px]" />
              Free shipping &amp; returns
            </span>
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-tertiary bg-tertiary-container/40 px-3 py-1.5 rounded-full font-medium">
              <Icon name="eco" className="text-[14px]" />
              Carbon neutral
            </span>
            {(() => {
              const currentStock = match ? Number(match.stock_quantity ?? match.stock ?? 10) : 10;
              if (currentStock <= 0) {
                return (
                  <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-error-container bg-error-container px-3 py-1.5 rounded-full font-semibold">
                    <Icon name="block" className="text-[14px]" />
                    Out of Stock
                  </span>
                );
              }
              if (currentStock <= 5) {
                return (
                  <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-error-container bg-error-container px-3 py-1.5 rounded-full font-semibold animate-pulse">
                    <Icon name="bolt" className="text-[14px]" />
                    Only {currentStock} left in stock
                  </span>
                );
              }
              return (
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-secondary-fixed-variant bg-secondary-fixed px-3 py-1.5 rounded-full font-medium">
                  <Icon name="check_circle" className="text-[14px]" />
                  In Stock ({currentStock} available)
                </span>
              );
            })()}
          </div>

          <div className="border-t border-outline-variant pt-6 flex flex-col gap-5">
            {variantTypes.map((variantType) => (
              <div key={variantType}>
                <span className="font-label-md text-label-md font-semibold text-on-surface mb-2 block">
                  {variantType.charAt(0).toUpperCase() + variantType.slice(1)}: {selectedVariants[variantType]}
                </span>
                <div className="flex flex-wrap gap-2">
                  {variantOptions[variantType].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelectedVariants((prev) => ({ ...prev, [variantType]: val }))}
                      className={`px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
                        selectedVariants[variantType] === val
                          ? "bg-primary text-on-primary font-semibold"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <label className="flex items-center justify-between cursor-pointer py-2">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  Gift wrap available
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Recycled kraft + seed paper tag — complimentary
                </span>
              </div>
              <input
                type="checkbox"
                checked={giftWrap}
                onChange={(e) => setGiftWrap(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center bg-surface-container rounded-xl">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-12 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Icon name="remove" className="text-[18px]" />
                </button>
                <span className="w-10 text-center font-label-lg text-label-lg font-semibold text-on-surface">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const maxAvail = match ? Number(match.stock_quantity ?? match.stock ?? 10) : 10;
                    setQty((q) => Math.min(maxAvail, q + 1));
                  }}
                  className="w-11 h-12 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  aria-label="Increase quantity"
                >
                  <Icon name="add" className="text-[18px]" />
                </button>
              </div>
              {(() => {
                const stockVal = match ? Number(match.stock_quantity ?? match.stock ?? 10) : 10;
                const disabled = stockVal <= 0;
                return (
                  <button
                    type="button"
                    onClick={addToBag}
                    disabled={disabled}
                    className="flex-1 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Icon name="shopping_bag" className="text-[20px]" />
                    {disabled ? "Out of Stock" : `Add to Bag — $${(unitPrice * qty).toFixed(2)}`}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Accordions */}
          <div className="mt-8 border-t border-outline-variant">
            {[
              { key: "details", label: "Details & Specifications", content: "Hand-thrown stoneware, matte mineral glaze. Approx. 750ml capacity. Microwave & dishwasher safe. Responsibly packed in recycled kraft." },
              { key: "materials", label: "Materials & Sourcing", content: "100% natural local stoneware clay and non-toxic reactive mineral glazes, co-fired with partner studio in Kyoto. No plasthetics or synthetic dyes." },
              { key: "care", label: "Care Instructions", content: "Clean with mild soap and warm water. Air dry fully. Avoid thermal shock — never move from boiling to cold. Glaze develops a soft patina over time." },
              { key: "shipping", label: "Shipping & Returns", content: "Free carbon-neutral shipping over $75. 30-day returns. Orders dispatch within 48 hours and arrive in 3–5 business days." },
            ].map((section) => (
              <div key={section.key} className="border-b border-outline-variant">
                <button
                  type="button"
                  onClick={() => toggleAccordion(section.key)}
                  className="w-full flex items-center justify-between py-4 text-left"
                >
                  <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                    {section.label}
                  </span>
                  <Icon
                    name={activeAccordion === section.key ? "expand_less" : "expand_more"}
                    className="text-on-surface-variant text-[20px]"
                  />
                </button>
                {activeAccordion === section.key && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed pb-4">
                    {section.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pairings */}
      <section className="mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
              Complete the ritual
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mt-1">Quiet Pairings</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pairingItems.map((p) => (
            <div key={p.name} className="flex flex-col bg-surface-container-lowest rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface-container mb-4">
                <img
                  className="w-full h-full object-cover"
                  alt={p.name}
                  src={p.image || DEFAULT_PRODUCT_IMAGE}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                  }}
                />
              </div>
              <div className="px-2 flex flex-col flex-1">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">{p.category}</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium mt-1">{p.name}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{p.detail}</p>
                <div className="flex items-center justify-between mt-3 pt-2">
                  <span className="font-title-md text-title-md font-semibold text-primary">${p.price.toFixed(2)}</span>
                  <span className={`font-label-sm text-label-sm font-medium ${p.status === "In Stock" ? "text-secondary" : "text-tertiary"}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}