import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../AuthContext";

const editorialImage =
  "https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&auto=format&fit=crop&q=80";

function LeftEditorial() {
  return (
    <div className="lg:col-span-5 relative flex flex-col justify-between p-8 sm:p-12 overflow-hidden bg-surface-container text-on-surface min-h-[420px]">
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover object-center brightness-95"
          alt="Sanctuary still life"
          src={editorialImage}
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-primary/30 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      </div>
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/20 backdrop-blur-md text-on-primary">
          <Icon name="eco" className="text-[16px] text-secondary-fixed" />
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-primary">B-Corp Certified</span>
        </div>
        <span className="font-label-sm text-label-sm text-primary-fixed px-3 py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md">
          100% Carbon Neutral
        </span>
      </div>
      <div className="relative z-10 my-auto py-12 flex flex-col gap-4">
        <div className="w-10 h-0.5 bg-secondary-fixed rounded-full mb-2" />
        <p className="font-headline-md text-headline-md text-on-primary font-medium leading-relaxed drop-shadow-sm">
          "Cultivating quiet domestic rituals and conscious craft since 2019."
        </p>
        <p className="font-body-sm text-body-sm text-primary-fixed leading-normal">
          Every piece, formulation, and textile is sourced from generational artisans dedicated to soil-to-table harmony.
        </p>
      </div>
      <div className="relative z-10 pt-6 bg-surface-container-lowest/10 backdrop-blur-md rounded-2xl p-5 text-on-primary">
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed font-semibold mb-3 block">
          Inner Circle Privileges
        </span>
        <div className="grid grid-cols-1 gap-2.5">
          {[
            { icon: "spa", text: "Seasonal capsule early window access" },
            { icon: "handshake", text: "Direct atelier pre-orders & custom sizing" },
            { icon: "package_2", text: "Compostable zero-plastic carbon-free shipping" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary-fixed/20 flex items-center justify-center flex-shrink-0 text-secondary-fixed">
                <Icon name={item.icon} className="text-[15px]" />
              </div>
              <span className="font-body-sm text-body-sm text-on-primary font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustFooter() {
  return (
    <>
      <div className="pt-8 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/60 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
            <Icon name="verified_user" className="text-[18px]" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-semibold text-on-surface">256-Bit SSL Encrypted</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Stripe Customer Identity Secured</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant font-label-sm text-label-sm">
          <div className="flex items-center gap-1.5">
            <Icon name="gavel" className="text-[16px] text-secondary" />
            <span>GDPR / CCPA Protected</span>
          </div>
          <span className="text-outline-variant">•</span>
          <div className="flex items-center gap-1.5">
            <Icon name="lock_reset" className="text-[16px] text-secondary" />
            <span>Zero-Tracker Login</span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
        {[
          { icon: "local_florist", title: "Artisanal Lineage", text: "Every login connects directly to curated master potters, linen weavers, and organic botanical foragers." },
          { icon: "inventory_2", title: "Effortless Re-Orders", text: "Replenish natural linen mists, ritual soy candles, and wild tea harvests with one-touch member checkout." },
          { icon: "volunteer_activism", title: "Conscious Gifting", text: "Store personalized sanctuary gift registries, custom botanical notes, and scheduled deliveries." },
        ].map((col) => (
          <div key={col.title} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex items-start gap-4 text-left">
            <Icon name={col.icon} className="text-primary text-[28px] mt-0.5" />
            <div className="flex flex-col gap-1">
              <h2 className="font-title-md text-title-md font-medium text-on-surface">{col.title}</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{col.text}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      navigate(data.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
      <div className="relative w-full max-w-6xl mx-auto my-4 lg:my-8">
        <div className="absolute -top-16 -left-12 w-96 h-96 bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-16 -right-12 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="w-full bg-surface-container-lowest rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <LeftEditorial />
          <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-surface-container-lowest">
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex p-1 rounded-full bg-surface-container-low" role="tablist">
                  <button className="px-6 py-2 rounded-full font-label-lg text-label-lg transition-all shadow-sm bg-surface-container-lowest text-primary font-semibold" type="button">
                    Sign In
                  </button>
                  <Link to="/register" className="px-6 py-2 rounded-full font-label-lg text-label-lg transition-all text-on-surface-variant hover:text-primary" type="button">
                    Create Account
                  </Link>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Secure Portal
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                    Welcome Back to Your Sanctuary
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Access your archived orders, botanical subscriptions, and ritual wishlists.
                  </p>
                </div>

                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  {error && (
                    <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="signin-email">Email Address</label>
                    <div className="relative flex items-center">
                      <Icon name="mail" className="absolute left-3.5 text-[18px] text-outline pointer-events-none" />
                      <input
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant outline-none shadow-sm focus:bg-surface-container-low transition-colors"
                        id="signin-email"
                        placeholder="eleanor@sanctuary.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-label-md text-on-surface font-medium" htmlFor="signin-password">Password</label>
                      <Link to="/forgot-password" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative flex items-center">
                      <Icon name="lock" className="absolute left-3.5 text-[18px] text-outline pointer-events-none" />
                      <input
                        className="w-full pl-11 pr-11 py-3 bg-surface-container-lowest rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant outline-none shadow-sm focus:bg-surface-container-low transition-colors"
                        id="signin-password"
                        placeholder="••••••••••••"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle password visibility"
                        className="absolute right-3.5 text-outline hover:text-on-surface transition-colors flex items-center"
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[19px]" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        checked={remember}
                        className="w-4 h-4 rounded bg-surface-container text-primary accent-primary cursor-pointer"
                        type="checkbox"
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Remember this ritual device</span>
                    </label>
                    <span className="font-label-sm text-label-sm text-outline">30-day session</span>
                  </div>
                  <button className="mt-2 w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 group" type="submit" disabled={loading}>
                    <span>{loading ? "Signing in..." : "Sign In to Veasna"}</span>
                    {!loading && <Icon name="arrow_forward" className="text-[18px] group-hover:translate-x-0.5 transition-transform" />}
                  </button>
                </form>
              </div>
            </div>

            <TrustFooter />
          </div>
        </div>
      </div>
    </div>
  );
}