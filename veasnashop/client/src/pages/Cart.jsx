import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useCart } from "../CartContext";
import { api } from "../api";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80";

export default function Cart() {
  const { items, updateQty, removeItem, toggleGiftWrap, clearCart, addItem, promoCode, applyPromo, clearPromo } = useCart();
  const [promo, setPromo] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    api.get("/products")
      .then((d) => {
        const list = (d.products || []).slice(0, 4);
        setSuggestions(list.map((p) => ({ name: p.name, image: p.image, price: p.price, productId: p.id })));
      })
      .catch(() => setSuggestions([]));
  }, []);

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const wrapFee = items.reduce((sum, it) => sum + (it.giftWrap ? 5 : 0), 0);
  const FREE_SHIP_THRESHOLD = 75;
  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : 12.0;
  const tax = Math.round((subtotal + wrapFee) * 0.0825 * 100) / 100;
  const discount = promoCode ? Math.round((subtotal + wrapFee + shipping + tax) * 0.15 * 100) / 100 : 0;
  const total = Math.max(0, subtotal + wrapFee + shipping + tax - discount);
  const itemCount = items.reduce((n, it) => n + it.qty, 0);

  const away = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);

  const handleApplyPromo = () => {
    if (applyPromo(promo)) setPromo("");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      <div className="flex flex-col w-full">
        {/* Breadcrumb + tracker */}
        <div className="flex items-center justify-between pb-6 border-b border-surface-container-high/60">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <Icon name="chevron_right" className="text-[14px] text-outline" />
            <Link to="/browse" className="hover:text-primary transition-colors">Shop</Link>
            <Icon name="chevron_right" className="text-[14px] text-outline" />
            <span className="text-primary font-semibold">Your Selection</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-primary font-label-sm text-label-sm tracking-wider uppercase bg-surface-container-low px-3 py-1 rounded-full">
            <Icon name="eco" className="text-[16px]" />
            <span>100% Carbon Neutral Transit</span>
          </div>
        </div>

        {/* Header + milestone */}
        <div className="mt-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                Your Conscious Living Cart
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed-dim text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                {itemCount} Items
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Deliberately gathered essentials, sustainably packaged and prepared with reverence for your daily sanctuary.
            </p>
          </div>
          <div className="w-full md:w-80 bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container-high/70">
            <div className="flex items-center justify-between font-label-sm text-label-sm mb-2">
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <Icon name="local_shipping" className="text-[16px]" />
                {away > 0 ? "Free Express Shipping" : "Free Shipping Unlocked"}
              </span>
              <span className="text-on-surface font-medium">{away > 0 ? `$${away.toFixed(2)} away` : "Applied"}</span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden relative">
              <div className="h-full bg-primary-container rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-outline mt-2 leading-tight">
              {away > 0
                ? `Add <span className="font-semibold text-primary">$${away.toFixed(2)}</span> more of conscious goods to unlock complimentary courier delivery.`
                : "Complimentary courier delivery unlocked for your order."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left column */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 overflow-hidden divide-y divide-surface-container-low">
              {items.length === 0 && (
                <div className="py-20 text-center">
                  <Icon name="shopping_bag" className="text-[42px] text-outline mx-auto mb-3" />
                  <p className="font-title-md text-title-md text-on-surface-variant">Your cart is empty</p>
                  <Link to="/browse" className="inline-block mt-4 text-primary font-label-lg text-label-lg font-medium hover:underline underline-offset-4">
                    Start Mindful Shopping
                  </Link>
                </div>
              )}
              {items.map((it) => (
                <article key={it.productId} className="p-6 sm:p-7 flex flex-col sm:flex-row gap-6 transition-colors hover:bg-surface/30">
                  <div className="relative w-28 sm:w-32 aspect-[4/5] rounded-xl overflow-hidden bg-surface-container-low shrink-0 shadow-sm">
                    <img
                      className="w-full h-full object-cover"
                      alt={it.name}
                      src={it.image || DEFAULT_PRODUCT_IMAGE}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                    <span className="absolute top-2 left-2 bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-[10px] px-2 py-0.5 rounded-full font-medium">
                      {it.tag}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-outline font-label-sm text-[11px] uppercase tracking-wider">{it.category}</span>
                        <Link to={`/products/${it.productId}`}>
                          <h3 className="font-headline-sm text-title-md text-on-surface font-medium hover:text-primary transition-colors">{it.name}</h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm pt-0.5">
                          <span>Variant: <strong className="font-medium text-on-surface">{it.variant}</strong></span>
                          <span className="text-outline-variant">•</span>
                          <span>Size: <strong className="font-medium text-on-surface">{it.size}</strong></span>
                          <span className="text-outline-variant">•</span>
                          <span className="text-outline font-mono text-[11px]">{it.sku}</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tabular-nums">
                          ${(it.price * it.qty).toFixed(2)}
                        </span>
                        {it.qty > 1 && (
                          <span className="block text-outline font-label-sm text-[11px]">${it.price.toFixed(2)} each</span>
                        )}
                      </div>
                    </div>
                    {it.giftWrap !== undefined && (
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/60 cursor-pointer hover:bg-surface-container-low transition-colors">
                        <input
                          className="accent-primary w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                          type="checkbox"
                          checked={it.giftWrap}
                          onChange={() => toggleGiftWrap(it.productId)}
                        />
                        <div className="flex-1 flex items-center justify-between text-on-surface font-body-sm text-body-sm">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Icon name="redeem" className="text-[18px] text-primary" />
                            Add Furoshiki Botanical Fabric Gift Wrap
                          </span>
                          <span className="font-label-md text-label-md font-semibold text-primary">+$5.00</span>
                        </div>
                      </label>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-surface-container-low">
                      <div className="flex items-center bg-surface-container-low rounded-xl p-1 gap-1">
                        <button
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface transition-colors"
                          type="button"
                          onClick={() => updateQty(it.productId, -1)}
                        >
                          <Icon name="remove" className="text-[16px]" />
                        </button>
                        <span className="w-8 text-center font-label-lg text-label-lg font-semibold tabular-nums text-on-surface">{it.qty}</span>
                        <button
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface transition-colors"
                          type="button"
                          onClick={() => updateQty(it.productId, 1)}
                        >
                          <Icon name="add" className="text-[16px]" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-on-surface-variant font-label-md text-label-md">
                        <div className={`flex items-center gap-1.5 ${it.status?.includes("In Stock") ? "text-secondary" : "text-tertiary"} font-medium`}>
                          <span className={`w-2 h-2 rounded-full ${it.status?.includes("In Stock") ? "bg-secondary" : "bg-tertiary"} animate-pulse`} />
                          {it.status}
                        </div>
                        <button className="hover:text-primary transition-colors flex items-center gap-1" type="button">
                          <Icon name="bookmark" className="text-[18px]" />
                          <span className="hidden sm:inline">Save for later</span>
                        </button>
                        <button
                          aria-label="Remove item"
                          className="text-outline hover:text-error transition-colors flex items-center gap-1"
                          type="button"
                          onClick={() => removeItem(it.productId)}
                        >
                          <Icon name="delete" className="text-[18px]" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <Link to="/browse" className="inline-flex items-center gap-2 text-primary font-label-lg text-label-lg hover:underline underline-offset-4 transition-all">
                <Icon name="arrow_back" className="text-[18px]" />
                Continue Mindful Shopping
              </Link>
              <div className="flex items-center gap-3">
                <button
                  className="text-outline hover:text-error font-label-md text-label-md px-4 py-2 rounded-xl transition-colors hover:bg-error-container/20"
                  type="button"
                  onClick={clearCart}
                >
                  Clear Cart
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary shrink-0">
                <Icon name="compost" className="text-[26px]" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-headline-sm text-title-md text-on-surface font-medium">100% Compostable Mycelium &amp; Algae Inks</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Every shipment arrives buffered in living mushroom mycelium and unbleached kraft paper that dissolves safely in backyard compost in 45 days.
                </p>
              </div>
              <Icon name="verified" className="text-outline-variant text-[24px] hidden sm:block" />
            </div>

            <div className="pt-4 flex flex-col gap-5">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-outline font-label-sm text-label-sm uppercase tracking-wider">Harmonious Additions</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Pairs Beautifully With Your Selection</h2>
                </div>
                <span className="text-primary font-label-sm text-label-sm font-semibold cursor-pointer hover:underline">Explore Rituals</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {suggestions.map((cs) => (
                  <div key={cs.productId} className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container-low shrink-0">
                      {cs.image ? (
                        <img
                          className="w-full h-full object-cover"
                          alt={cs.name}
                          src={cs.image || DEFAULT_PRODUCT_IMAGE}
                          onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant"><Icon name="category" className="text-[24px]" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-title-md text-body-lg text-on-surface font-medium truncate">{cs.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-label-lg text-label-lg font-semibold text-on-surface tabular-nums">${Number(cs.price).toFixed(2)}</span>
                        <button className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary text-label-sm font-label-sm font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1" type="button" onClick={() => addItem({ productId: cs.productId, name: cs.name, category: "", price: Number(cs.price), qty: 1, variant: "", size: "", sku: "", tag: "", status: "In Stock", image: cs.image })}>
                          <Icon name="add" className="text-[14px]" />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 flex flex-col gap-6">
            <div className="p-6 sm:p-7 bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/70 flex flex-col gap-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold pb-4 border-b border-surface-container-low">
                Order Summary
              </h3>
              <div className="flex flex-col gap-3 font-body-md text-body-md text-on-surface-variant">
                <div className="flex justify-between items-center">
                  <span>Items Subtotal ({items.length})</span>
                  <span className="text-on-surface font-medium tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    Furoshiki Wrap
                    <Icon name="help_outline" className="text-[15px] text-outline cursor-pointer" />
                  </span>
                  <span className="text-on-surface font-medium tabular-nums">${wrapFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-on-surface">Eco-Standard Shipping</span>
                    <span className="text-outline font-label-sm text-[11px]">3-5 Business Days</span>
                  </div>
                  <span className="text-on-surface font-medium tabular-nums">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 text-primary">
                    <Icon name="park" className="text-[16px]" />
                    Forest Carbon Offset
                  </span>
                  <span className="font-label-sm text-label-sm uppercase font-semibold text-primary bg-primary-fixed-dim/30 px-2 py-0.5 rounded">
                    Complimentary
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Estimated Sales Tax</span>
                  <span className="text-on-surface font-medium tabular-nums">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <details className="group">
                  <summary className="flex items-center justify-between font-label-md text-label-md text-primary font-medium cursor-pointer list-none py-1 select-none">
                    <span className="flex items-center gap-1.5">
                      <Icon name="sell" className="text-[18px]" />
                      Have a promo code or gift card?
                    </span>
                    <Icon name="expand_more" className="text-[18px] transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pt-3 flex gap-2">
                    {promoCode ? (
                      <div className="flex-1 flex items-center justify-between bg-primary-fixed-dim/30 px-3 py-2.5 rounded-xl font-label-sm text-label-sm text-on-primary-fixed-variant font-semibold">
                        <span>{promoCode} applied −15%</span>
                        <button type="button" onClick={clearPromo} className="hover:text-error transition-colors p-1">
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          className="flex-1 uppercase bg-surface-container-low px-3 py-2.5 rounded-xl font-label-sm text-label-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary focus:bg-surface-container-lowest outline-none transition-all"
                          placeholder="E.g. BOTANICAL15"
                          type="text"
                          value={promo}
                          onChange={(e) => setPromo(e.target.value)}
                        />
                        <button className="px-4 py-2.5 bg-tertiary-container hover:bg-tertiary text-on-tertiary rounded-xl font-label-md text-label-md font-medium transition-colors" type="button" onClick={handleApplyPromo}>
                          Apply
                        </button>
                      </>
                    )}
                  </div>
                </details>
              </div>

              <div className="pt-4 border-t border-surface-container-low flex items-baseline justify-between">
                <div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total</span>
                  <span className="block text-outline font-label-sm text-[11px]">Includes all calculated import duties</span>
                </div>
                <div className="text-right">
                  <span className="font-headline-lg text-headline-lg text-primary font-semibold tabular-nums">
                    ${total.toFixed(2)}
                  </span>
                  <span className="block text-outline font-label-sm text-[11px]">USD</span>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/checkout"
                  className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg py-4 px-6 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Proceed to Checkout</span>
                  <Icon name="arrow_forward" className="text-[20px] transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="pt-4 border-t border-surface-container-low flex flex-col gap-3">
                <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="verified_user" className="text-primary text-[18px]" />
                  <span>Stripe 256-Bit Encrypted Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="cached" className="text-primary text-[18px]" />
                  <span>30-Day Mindful Returns &amp; Exchanges</span>
                </div>
                <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
                  <Icon name="nature" className="text-primary text-[18px]" />
                  <span>Plastic-Free Certified Delivery</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-surface-container-high/60 flex items-start gap-3">
              <Icon name="spa" className="text-tertiary text-[20px] mt-0.5" />
              <div className="space-y-1">
                <p className="font-label-md text-label-md font-medium text-on-surface">Veasna Concierge Available</p>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                  Need guidance on linen sizing or botanical essential oil compatibility? Our Tokyo &amp; Copenhagen ateliers are online.
                </p>
                <span className="inline-block text-primary font-label-sm text-label-sm font-semibold hover:underline pt-1">
                  Chat with Concierge →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}