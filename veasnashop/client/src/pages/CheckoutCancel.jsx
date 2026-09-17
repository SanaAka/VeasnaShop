import { Link } from "react-router-dom";
import Icon from "../components/Icon";

export default function CheckoutCancel() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      <div className="flex flex-col items-center text-center max-w-lg mx-auto py-16">
        <div className="w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center mb-6">
          <Icon name="cancel" className="text-error text-[36px]" />
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold mb-2">
          Checkout was not completed
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
          Your order has not been placed. Your carefully curated items are still
          waiting in your cart, ready whenever you are.
        </p>

        <div className="bg-surface-container-lowest rounded-2xl p-6 w-full shadow-sm mb-8">
          <h2 className="font-title-md text-title-md font-semibold text-on-surface mb-3">What happened?</h2>
          <div className="flex flex-col gap-3 text-left text-on-surface-variant font-body-sm text-body-sm">
            <div className="flex items-start gap-3">
              <Icon name="info" className="text-outline text-[18px] mt-0.5 shrink-0" />
              <span>The checkout session was closed or the payment was not confirmed.</span>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="info" className="text-outline text-[18px] mt-0.5 shrink-0" />
              <span>No charges have been made to your payment method.</span>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="info" className="text-outline text-[18px] mt-0.5 shrink-0" />
              <span>Your cart items remain saved for 24 hours.</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <Link
            to="/cart"
            className="flex-1 w-full px-6 py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            Return to Cart
          </Link>
          <Link
            to="/browse"
            className="flex-1 w-full px-6 py-3.5 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
          >
            <Icon name="shopping_bag" className="text-[20px]" />
            Continue Browsing
          </Link>
        </div>

        <p className="mt-8 font-body-sm text-body-sm text-outline">
          Need help? <span className="text-primary font-medium cursor-pointer hover:underline">Contact our Concierge</span>
        </p>
      </div>
    </div>
  );
}