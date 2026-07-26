import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { runtimeConfig } from "@/config/runtime";
import { queryKeys } from "@/api/query-client";
import { Seo } from "@/components/seo";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/pricing/pricing.css";
import "@/styles/routes/checkout/checkout.css";

interface Quote {
  amount_cents: number;
}
interface Subscribe {
  subscription_id: string;
  client_secret: string;
}
interface StripeResult {
  error?: { message?: string };
}
interface StripeElements {
  create: (type: string) => { mount: (selector: string) => void };
}
interface StripeClient {
  elements: (options: unknown) => StripeElements;
  confirmPayment: (options: unknown) => Promise<StripeResult>;
}
declare global {
  interface Window {
    Stripe?: (key: string) => StripeClient;
  }
}
const loadStripe = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Stripe) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.stripe.com/v3/"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.append(script);
  });

export function CheckoutPage() {
  const { t } = useTranslation();
  useBodyClass("pricing-page");
  const [params] = useSearchParams(),
    tier = params.get("tier") ?? "",
    seats = Number(params.get("seats") ?? 0),
    interval = params.get("interval") === "year" ? "year" : "month",
    selfHosted = ["1", "true"].includes(params.get("selfHosted") ?? "");
  const valid =
    (tier === "developer" && seats === 1) || (tier === "business" && seats >= 2 && seats <= 100);
  const settings = useQuery({
    queryKey: queryKeys.platform,
    queryFn: ({ signal }) =>
      api.get<{ billing_enabled?: boolean }>("/api/settings/platform/public", signal, false),
  });
  const quote = useQuery({
    queryKey: ["billing", "quote", tier, seats, interval, selfHosted],
    enabled: valid && settings.data?.billing_enabled === true,
    queryFn: () =>
      api.post<Quote>("/api/billing/quote", { tier, seats, interval, self_hosted: selfHosted }),
  });
  const [error, setError] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [success, setSuccess] = useState(false);
  const stripe = useRef<StripeClient | null>(null),
    elements = useRef<StripeElements | null>(null),
    subscription = useRef<string | null>(null);
  useEffect(() => {
    if (!quote.data || !runtimeConfig.STRIPE_PUBLISHABLE_KEY) return;
    let active = true;
    void (async () => {
      try {
        await loadStripe();
        if (!active || !window.Stripe) return;
        stripe.current = window.Stripe(runtimeConfig.STRIPE_PUBLISHABLE_KEY);
        const started = await api.post<Subscribe>("/api/billing/subscribe", {
          tier,
          seats,
          interval,
          self_hosted: selfHosted,
        });
        if (!active) return;
        subscription.current = started.subscription_id;
        sessionStorage.setItem("co_subscription_id", started.subscription_id);
        elements.current = stripe.current.elements({
          clientSecret: started.client_secret,
          appearance: { theme: "night" },
        });
        elements.current.create("payment").mount("#payment-element");
        setReady(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : i18n.t("dynamic.text_5a8f909a10b9"));
      }
    })();
    return () => {
      active = false;
    };
  }, [quote.data, tier, seats, interval, selfHosted]);
  const confirm = useMutation({
    mutationFn: async () => {
      if (!stripe.current || !elements.current)
        throw new Error(i18n.t("dynamic.text_ef8ff3e16db1"));
      const result = await stripe.current.confirmPayment({
        elements: elements.current,
        confirmParams: {
          return_url: `${location.origin}/checkout/?tier=${tier}&seats=${seats}&interval=${interval}&complete=1`,
        },
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message ?? "El pago no se pudo completar");
      const id = subscription.current ?? sessionStorage.getItem("co_subscription_id");
      if (id) await api.post("/api/billing/confirm", { subscription_id: id });
      sessionStorage.removeItem("co_subscription_id");
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => location.assign("/profile/?section=billing"), 1500);
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    confirm.mutate();
  };
  if (settings.data && settings.data.billing_enabled === false) return <Navigate to="/" replace />;
  if (!valid) return <Navigate to="/pricing/" replace />;
  const shownError =
    error ??
    (quote.error instanceof ApiError
      ? quote.error.message
      : confirm.error instanceof Error
        ? confirm.error.message
        : null);
  return (
    <>
      <Seo
        title={t("seo.checkout.title")}
        description={t("seo.checkout.description")}
        path="/checkout/"
        noindex
      />

      <header className="pr-header">
        <Link className="pr-logo" to="/">
          {t("legacy.text_1fda9fc57a04")}
          <span>{t("legacy.text_a38df5fc50fb")}</span>
        </Link>

        <div className="pr-header-divider" />

        <span className="pr-header-label">{t("legacy.text_3ac8e9e58c5a")}</span>

        <div className="pr-header-spacer" />

        <Link to="/pricing/" className="pr-header-link">
          {t("legacy.text_36a9c00480fc")}
        </Link>
      </header>

      <main className="pr-main co-main">
        <div className="co-card">
          <h1 className="co-title">{t("legacy.text_be97a424ab91")}</h1>

          <div className="co-summary">
            <div className="co-summary-row">
              <span>{tier === "developer" ? "Individual" : "Business"}</span>

              <span>{tier === "business" ? `${seats} licencias` : "1 licencia"}</span>
            </div>

            <div className="co-summary-total">
              <span>
                {quote.data
                  ? new Intl.NumberFormat(i18n.resolvedLanguage === "en" ? "en-IE" : "es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(quote.data.amount_cents / 100)
                  : "—"}
              </span>

              <span>/ {interval === "year" ? i18n.t("dynamic.text_8470d9e5f751") : "mes"}</span>
            </div>
          </div>

          {success ? (
            <div className="co-success">
              <p>{t("legacy.text_e98129ad206c")}</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div id="payment-element" />

              {shownError && (
                <div className="co-error" role="alert">
                  {shownError}
                </div>
              )}

              <button className="pr-btn co-submit" disabled={!ready || confirm.isPending}>
                {confirm.isPending
                  ? t("pricing.checkout_processing")
                  : quote.data
                    ? t("pricing.checkout_amount", {
                        amount: new Intl.NumberFormat(
                          i18n.resolvedLanguage === "en" ? "en-IE" : "es-ES",
                          { style: "currency", currency: "EUR" },
                        ).format(quote.data.amount_cents / 100),
                      })
                    : t("pricing.checkout_loading")}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
