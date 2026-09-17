import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { api } from "../api";

const editorialImage =
  "https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&auto=format&fit=crop&q=80";

const trustPillars = [
  { icon: "encrypted", title: "256-Bit SSL", note: "Protected access" },
  { icon: "verified_user", title: "Zero-Spam", note: "Strict confidentiality" },
  { icon: "shield_with_heart", title: "Privacy Shield", note: "EU/GDPR compliant" },
];

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sent || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [sent, countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      setCountdown(45);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setSending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setCountdown(30);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 lg:py-12">
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md group"
        >
          <Icon name="arrow_back" className="text-[18px] transition-transform group-hover:-translate-x-1" />
          <span>Return to Sign In</span>
        </Link>
        <div className="hidden sm:flex items-center gap-2 font-label-sm text-label-sm text-outline uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim inline-block" />
          <span>Account Concierge · Step 1 of 2</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="bg-surface-container-lowest rounded-2xl p-8 sm:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm mb-6">
              <Icon name="lock_reset" className="text-[16px]" />
              <span className="tracking-wider uppercase">Authentication Care</span>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-3 tracking-tight">
              Restore Account Access
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-8 max-w-xl">
              Enter the email address tied to your Veasna sanctuary account. We will send a secure, mindful
              recovery link with single-use credentials.
            </p>

            {sent && (
              <div className="mb-8 p-5 rounded-xl bg-surface-container-low transition-all duration-500">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="mark_email_read" className="text-[18px]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-headline-sm text-headline-sm text-primary font-semibold mb-1">
                      Recovery Dispatch Complete
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      A recovery link has been dispatched to{" "}
                      <span className="text-on-surface font-semibold underline decoration-secondary-fixed-dim">
                        {email || "your email"}
                      </span>{" "}
                      with a 60-minute active expiration.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        className={`font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5 ${
                          countdown > 0 ? "text-primary" : "text-primary hover:text-primary-container"
                        }`}
                        disabled={countdown > 0}
                        type="button"
                        onClick={resend}
                      >
                        <Icon name="refresh" className="text-[16px]" />
                        {countdown > 0 ? `Resend link (${countdown}s)` : "Resend link now"}
                      </button>
                      <span className="text-outline-variant">·</span>
                      <Link to="/login" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
                        Back to Sign In
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block font-label-md text-label-md text-on-surface font-semibold" htmlFor="recoveryEmail">
                  Sanctuary Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <Icon name="mail" className="text-[20px]" />
                  </div>
                  <input
                    className="w-full pl-11 pr-4 py-3 bg-surface rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/30 transition-all"
                    id="recoveryEmail"
                    name="email"
                    placeholder="eleanor@sanctuary.com"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="font-body-sm text-body-sm text-error flex items-center gap-1.5">
                    <Icon name="error" className="text-[16px]" />
                    {error}
                  </p>
                )}
                {!error && (
                  <p className="font-body-sm text-body-sm text-outline flex items-center gap-1.5 pt-1">
                    <Icon name="info" className="text-[16px] text-primary" />
                    Please check your junk or promotions folder if unreceived within 2–3 minutes.
                  </p>
                )}
              </div>

              <button
                className="w-full bg-primary text-on-primary font-label-lg text-label-lg py-3.5 px-6 rounded-xl hover:bg-primary-container transition-all duration-200 flex items-center justify-center gap-2 shadow-sm group"
                id="submitBtn"
                type="submit"
                disabled={sending}
              >
                {sending ? (
                  <Icon name="progress_activity" className="text-[18px] animate-spin" />
                ) : (
                  <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-1" />
                )}
                <span>{sending ? "Securing link..." : "Send Reset Link"}</span>
              </button>
            </form>

            <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to="/login" className="font-label-md text-label-md text-primary font-medium hover:underline inline-flex items-center gap-1">
                <Icon name="chevron_left" className="text-[16px]" />
                Remember your password? Sign in
              </Link>
              <Link to="/register" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
                New to Veasna? <span className="font-semibold text-primary">Create Sanctuary Account</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 px-2">
            {trustPillars.map((t) => (
              <div key={t.title} className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low">
                <Icon name={t.icon} className="text-primary text-[20px]" />
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">{t.title}</span>
                  <span className="font-label-sm text-label-sm text-outline truncate">{t.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="relative rounded-2xl overflow-hidden shadow-sm flex flex-col justify-end min-h-[380px] lg:min-h-[460px] p-8 text-on-primary bg-primary-container">
            <img
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-35 filter saturate-75"
              alt="Dried eucalyptus stems, handcrafted ceramics, and organic linen in soft morning sun"
              src={editorialImage}
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-on-primary font-label-sm text-label-sm">
                <Icon name="nature_people" className="text-[14px]" />
                <span>Sanctuary Custody</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-primary font-medium tracking-tight">
                Mindful Security for Intentional Living
              </h3>
              <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
                Every profile at Veasna reflects your personal rhythm and curated home rituals. Our secure
                authentication safeguards your past orders, private bespoke consultations, and heirloom
                wishlist.
              </p>
              <div className="pt-2 flex items-center gap-4">
                <div className="flex -space-x-2 overflow-hidden">
                  {[
                    ["VS", "bg-surface-container text-primary"],
                    ["SL", "bg-secondary-fixed text-on-secondary-fixed"],
                    ["24", "bg-tertiary-fixed text-on-tertiary-fixed"],
                  ].map(([initials, cls]) => (
                    <div
                      key={initials}
                      className={`inline-block h-7 w-7 rounded-full ring-2 ring-surface flex items-center justify-center text-[10px] font-bold ${cls}`}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span className="font-label-sm text-label-sm text-on-primary-container">
                  Curated for 18,000+ conscious members
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm">
                <Icon name="support_agent" className="text-[22px]" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-title-md text-title-md text-on-surface font-semibold">
                  Need Immediate Assistance?
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  If you no longer have access to this inbox or require identity verification, our dedicated
                  concierge is on hand to guide you.
                </p>
                <div className="pt-3 flex flex-wrap items-center gap-4">
                  <a className="font-label-md text-label-md text-primary hover:text-primary-container font-semibold inline-flex items-center gap-1 group" href="mailto:concierge@veasnashop.com">
                    <span>Connect with Concierge</span>
                    <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-0.5" />
                  </a>
                  <span className="text-outline-variant">•</span>
                  <span className="font-label-md text-label-md text-outline">Mon–Fri 9am–6pm CET</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}