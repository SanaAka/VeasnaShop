import { Link, useLocation } from "react-router-dom";
import Icon from "../components/Icon";

export default function CheckoutSuccess() {
  const { state } = useLocation();
  const order = state?.order;

  const details = order
    ? [
        { label: "Order Number", value: order.id },
        { label: "Estimated Delivery", value: order.estimatedDelivery },
        { label: "Payment", value: order.payment },
        { label: "Shipping", value: order.shippingMethod },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      <div className="flex flex-col items-center text-center max-w-lg mx-auto py-16">
        <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center mb-6">
          <Icon name={order ? "check_circle" : "help"} filled className="text-primary text-[36px]" />
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold mb-2">
          {order ? "Thank you for your mindful order" : "Checkout Status"}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
          {order
            ? "Your consciously crafted goods are being prepared with reverence. Your confirmation is on its way to your email."
            : "Checkout was completed but we could not load your order details at this time."}
        </p>

        <div className="bg-surface-container-lowest rounded-2xl p-6 w-full shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="receipt_long" className="text-primary text-[22px]" />
            <h2 className="font-title-md text-title-md font-semibold text-on-surface">Order Details</h2>
          </div>
          <div className="flex flex-col gap-3 text-left">
            {details.map((row) => (
              <div key={row.label} className="flex justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span>{row.label}</span>
                <span className="text-on-surface font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          {order && (
            <div className="mt-4 pt-4 border-t border-surface-container-low flex justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span>Total Paid</span>
              <span className="text-on-surface font-semibold font-mono">${Number(order.total).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <Link
            to="/browse"
            className="flex-1 w-full px-6 py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
          >
            <Icon name="shopping_bag" className="text-[20px]" />
            Continue Mindful Shopping
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 w-full px-6 py-3.5 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
          >
            <Icon name="person" className="text-[20px]" />
            View My Dashboard
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant w-full">
          <div className="flex items-center justify-center gap-2 text-primary mb-3">
            <Icon name="eco" className="text-[18px]" />
            <span className="font-label-sm text-label-sm font-semibold">Sustainability Note</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Your order ships in 100% compostable mycelium packaging.
            Carbon offsets have been applied to neutralize the full logistics footprint.
          </p>
        </div>
      </div>
    </div>
  );
}