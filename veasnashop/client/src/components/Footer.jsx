import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { api } from "../api";

const footerCols = [
  {
    title: "Shop",
    links: [
      { label: "Living", to: "/products" },
      { label: "Ceramics", to: "/products" },
      { label: "Linen", to: "/products" },
      { label: "Botanicals", to: "/products" },
      { label: "Gift Cards", to: "/products" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Shipping & Returns", to: "/" },
      { label: "Order Tracking", to: "/dashboard" },
      { label: "FAQ", to: "/" },
      { label: "Contact Us", to: "/" },
    ],
  },
  {
    title: "Conscious Living",
    links: [
      { label: "Ethics & Sustainability", to: "/" },
      { label: "Store Locator", to: "/" },
    ],
    extra: (
      <div className="mt-4 flex flex-col gap-2">
        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
          Payment Security
        </span>
        <div className="flex items-center gap-2">
          <Icon name="verified_user" className="text-primary text-[20px]" />
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            Stripe Verified Secure
          </span>
        </div>
      </div>
    ),
  },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const onSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await api.post("/newsletter/subscribe", { email });
      setSubscribed(true);
      setEmail("");
    } catch {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <Icon name="spa" className="text-primary text-[22px]" />
              <span className="font-title-md text-title-md tracking-wider text-primary font-semibold">
                VEASNA
              </span>
            </Link>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Mindfully crafted lifestyle essentials and organic botanicals
              curated for intentional living and everyday grounded calm.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 mt-2 bg-white rounded-xl px-3 py-2.5 ring-1 ring-primary/30">
                <Icon name="mark_email_read" className="text-primary text-[18px]" />
                <span className="font-body-sm text-body-sm text-on-surface">
                  You're in — seasonal letters land every full moon.
                </span>
              </div>
            ) : (
              <form className="flex flex-col gap-2 mt-2" onSubmit={onSubscribe}>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Join our newsletter
                </span>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-3 py-2 bg-surface-container-lowest rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none ring-1 ring-outline-variant focus:ring-primary"
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    className="bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-full hover:bg-primary-container transition-colors"
                    type="submit"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            )}
            <span className="font-label-sm text-label-sm text-outline mt-4">
              © {new Date().getFullYear()} Veasna Shop. All rights reserved.
            </span>
          </div>
          {footerCols.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h4 className="font-headline-sm text-headline-sm text-on-surface font-medium mb-1">
                {col.title}
              </h4>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {col.extra}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}