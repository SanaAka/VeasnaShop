import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51UGE8zE1hOSiA5hhIcx54u6ZBZYmKdFNfpwPGcNnKopAjPnaCN6p7XT0me0E6TRKbLxVJpdpczrNCEzVKT8HgfYj00RW1BidRE",
  {
    // Disables r.stripe.com telemetry beacon calls to prevent ERR_BLOCKED_BY_CLIENT in dev / ad-blocked browsers
    advancedFraudSignals: false,
  }
);