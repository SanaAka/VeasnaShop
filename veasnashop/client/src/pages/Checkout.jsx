import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import Icon from "../components/Icon";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { stripePromise } from "../stripe";
import { api } from "../api";

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80";

const cardElementOptions = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1C1B1F",
      "::placeholder": { color: "#79747E" },
    },
    invalid: { color: "#B3261E" },
  },
};

function CheckoutForm() {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { items, clearCart, promoCode } = useCart();
  const { token } = useAuth();

  const [billing, setBilling] = useState({ name: "", email: "", phone: "" });
  const [shipping, setShipping] = useState({
    line1: "", line2: "", city: "", state: "", zip: "", country: "US",
  });
  const [saveInfo, setSaveInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const lineItems = items.map((it) => ({
    name: it.name,
    detail: `${it.variant || ""}${it.variant && it.size ? " / " : ""}${it.size || ""}${it.qty > 1 ? ` ×${it.qty}` : ""}`.trim(),
    price: it.price * it.qty,
    note: it.giftWrap ? "+$5.00 Furoshiki wrap" : undefined,
    image: it.image,
  }));
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const wrapFee = items.reduce((sum, it) => sum + (it.giftWrap ? 5 : 0), 0);
  const FREE_SHIP_THRESHOLD = 75;
  const shippingCost = subtotal >= FREE_SHIP_THRESHOLD ? 0 : 12.0;
  const tax = Math.round((subtotal + wrapFee) * 0.0825 * 100) / 100;
  const itemCount = items.reduce((n, it) => n + it.qty, 0);
  const discount = promoCode ? Math.round((subtotal + wrapFee + shippingCost + tax) * 0.15 * 100) / 100 : 0;
  const total = Math.max(0, subtotal + wrapFee + shippingCost + tax - discount);

  const handleBilling = (field) => (e) => setBilling((b) => ({ ...b, [field]: e.target.value }));
  const handleShipping = (field) => (e) => setShipping((s) => ({ ...s, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!token) {
      navigate("/login");
      return;
    }
    if (!billing.name || !billing.email) {
      setError("Please provide your billing name and email.");
      return;
    }
    if (!shipping.line1 || !shipping.city) {
      setError("Please provide your shipping address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const intResp = await api.post(
        "/checkout/payment-intent",
        {
          amount: Math.round(total * 100),
          currency: "usd",
          lineItems: items.map((it) => ({ name: it.name, qty: it.qty, price: Math.round(it.price * 100) })),
          customer: { name: billing.name, email: billing.email },
          shipping,
          saveInfo,
        },
        token
      );

      const { clientSecret } = intResp;

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: billing.name,
            email: billing.email,
          },
        },
        shipping: {
          name: billing.name,
          address: {
            line1: shipping.line1,
            line2: shipping.line2 || undefined,
            city: shipping.city,
            state: shipping.state,
            postal_code: shipping.zip,
            country: shipping.country || "US",
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const orderResp = await api.post(
        "/checkout",
        {
          paymentIntentId: result.paymentIntent.id,
          billing,
          shipping,
          lineItems: items.map((it) => ({
            productId: it.productId,
            variantId: it.variantId || 0,
            qty: it.qty,
            price: Math.round(it.price * 100),
            name: it.name,
            sku: it.sku || "",
            image: it.image || "",
            variant: it.variant || "",
          })),
          totals: { subtotal, wrapFee, shipping: shippingCost, tax, total },
          promoCode: null,
        },
        token
      );

      clearCart();
      navigate("/checkout/success", { state: { order: orderResp.order } });
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
      onSubmit={handleSubmit}
    >
      {/* Left column */}
      <div className="lg:col-span-7 flex flex-col gap-8">
        {/* Billing info */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-lg text-label-lg font-bold">1</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Billing Information</h2>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">Full Name</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="Sora Vilaysak"
                  type="text"
                  value={billing.name}
                  onChange={handleBilling("name")}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">Email</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="sora@example.com"
                  type="email"
                  value={billing.email}
                  onChange={handleBilling("email")}
                />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="font-label-md text-label-md font-medium text-on-surface">Phone (Optional)</span>
              <input
                className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                placeholder="+1 (555) 000-0000"
                type="tel"
                value={billing.phone}
                onChange={handleBilling("phone")}
              />
            </label>
          </div>
        </div>

        {/* Shipping address */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-lg text-label-lg font-bold">2</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Shipping Address</h2>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">Street Address</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="123 Zen Garden Lane"
                  type="text"
                  value={shipping.line1}
                  onChange={handleShipping("line1")}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">Apartment, Suite (Optional)</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="Apt 4B"
                  type="text"
                  value={shipping.line2}
                  onChange={handleShipping("line2")}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">City</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="Portland"
                  type="text"
                  value={shipping.city}
                  onChange={handleShipping("city")}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">State</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="OR"
                  type="text"
                  value={shipping.state}
                  onChange={handleShipping("state")}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-md text-label-md font-medium text-on-surface">Zip Code</span>
                <input
                  className="px-4 py-3 bg-surface-container-low rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="97201"
                  type="text"
                  value={shipping.zip}
                  onChange={handleShipping("zip")}
                />
              </label>
            </div>
            <label className="flex items-center gap-3 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={saveInfo}
                onChange={(e) => setSaveInfo(e.target.checked)}
                className="w-5 h-5 accent-primary rounded"
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Save address for future mindful purchases
              </span>
            </label>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-lg text-label-lg font-bold">3</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Payment Method</h2>
            <span className="font-label-sm text-label-sm text-outline">Powered by Stripe</span>
          </div>
          <div className="flex flex-col gap-5">
            <div className="rounded-xl bg-surface-container-low p-4 font-body-md text-body-md text-on-surface focus-within:ring-2 focus-within:ring-primary/40 transition-all">
              <CardElement options={cardElementOptions} />
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <Icon name="verified_user" className="text-primary text-[18px]" />
              <span>Bank-grade 256-bit TLS encryption protects your card details.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="lg:col-span-5 lg:sticky lg:top-28 flex flex-col gap-6">
        <div className="p-6 sm:p-7 bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/70 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Icon name="shopping_bag" className="text-primary text-[22px]" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Order Summary</h3>
            <span className="ml-auto bg-primary-container text-on-primary px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold">{itemCount}</span>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="flex items-start gap-3 pb-4 border-b border-surface-container-low last:border-0 last:pb-0">
                <div className="w-14 h-14 rounded-xl bg-surface-container shrink-0 overflow-hidden">
                  {item.image ? (
                    <img
                      className="w-full h-full object-cover"
                      alt={item.name}
                      src={item.image || DEFAULT_PRODUCT_IMAGE}
                      onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <Icon name="category" className="text-[20px]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-label-md text-label-md font-medium text-on-surface truncate block">{item.name}</span>
                  <span className="font-body-sm text-body-sm text-outline">{item.detail}</span>
                  {item.note && <span className="block font-body-sm text-[11px] text-on-surface-variant mt-0.5">{item.note}</span>}
                </div>
                <span className="font-label-lg text-label-lg font-semibold text-on-surface shrink-0">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 text-on-surface-variant font-body-md text-body-md">
            <div className="flex justify-between"><span>Subtotal</span><span className="text-on-surface font-medium tabular-nums">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Furoshiki Wrap</span><span className="text-on-surface font-medium tabular-nums">${wrapFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Eco-Standard Shipping</span><span className="text-on-surface font-medium tabular-nums">${shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-primary"><span className="flex items-center gap-1"><Icon name="park" className="text-[16px]" />Carbon Offset</span><span className="font-label-sm text-label-sm font-semibold bg-primary-fixed-dim/30 px-2 py-0.5 rounded">Free</span></div>
            <div className="flex justify-between"><span>Estimated Tax</span><span className="text-on-surface font-medium tabular-nums">${tax.toFixed(2)}</span></div>
          </div>

          <div className="pt-4 border-t border-surface-container-low flex items-baseline justify-between">
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total</span>
              <span className="block text-outline font-label-sm text-[11px]">Includes import duties where applicable</span>
            </div>
            <div className="text-right">
              <span className="font-headline-lg text-headline-lg text-primary font-semibold tabular-nums">${total.toFixed(2)}</span>
              <span className="block text-outline font-label-sm text-[11px]">USD</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
            <Icon name="error_outline" className="text-[18px] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg py-4 px-6 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting || !stripe || itemCount === 0}
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />
              Processing...
            </>
          ) : (
            <>Complete Purchase — ${total.toFixed(2)}</>
          )}
        </button>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="verified_user" className="text-primary text-[18px]" />
            <span>Stripe 256-Bit Encrypted</span>
          </div>
          <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="cached" className="text-primary text-[18px]" />
            <span>30-Day Mindful Returns</span>
          </div>
          <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="nature" className="text-primary text-[18px]" />
            <span>Plastic-Free Delivery</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-surface-container-high/60 flex items-start gap-3">
          <Icon name="spa" className="text-tertiary text-[20px] mt-0.5" />
          <div className="space-y-1">
            <p className="font-label-md text-label-md font-medium text-on-surface">Veasna Concierge Online</p>
            <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
              Need sizing guidance? Our botanists are available on live chat through checkout.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function Checkout() {
  const { token } = useAuth();
  const { items } = useCart();
  const itemCount = items.reduce((n, it) => n + it.qty, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      <div className="flex flex-col w-full">
        <section className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-3">
            <Link to="/cart" className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              <Icon name="arrow_back" className="text-[16px]" />
              Return to Bag
            </Link>
            <span className="text-outline font-label-sm">/</span>
            <span className="font-label-md text-label-md text-primary font-medium tracking-wide">Secure Conscious Checkout</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full">
              <Icon name="verified_user" filled className="text-primary text-[17px]" />
              <span className="font-label-sm text-label-sm text-on-surface font-semibold tracking-tight">Stripe 256-Bit Encrypted</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
              <Icon name="eco" className="text-secondary text-[16px]" />
              <span>Carbon Negative Checkout</span>
            </div>
          </div>
        </section>

        {!token ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
            <Icon name="lock" className="text-[40px] text-outline mx-auto mb-3" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">Sign in to complete your purchase</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">You need to be signed in to check out securely.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md"
            >
              <Icon name="login" className="text-[20px]" />
              Go to Login
            </Link>
          </div>
        ) : itemCount === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
            <Icon name="shopping_bag" className="text-[40px] text-outline mx-auto mb-3" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">Your cart is empty</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">Add some mindful essentials before checking out.</p>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md"
            >
              <Icon name="shopping_bag" className="text-[20px]" />
              Continue Shopping
            </Link>
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <CheckoutForm />
          </Elements>
        )}
      </div>
    </div>
  );
}