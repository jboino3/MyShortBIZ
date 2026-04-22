import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE } from "../lib/apiBase";
import "./Payment.scss";

type Plan = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  interval: string;
};

type CheckoutResponse = {
  checkout_url: string;
  status: string;
};

type CardFormState = {
  cardholderName: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

export default function Payment() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("");

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [btcSubmitting, setBtcSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [btcError, setBtcError] = useState<string | null>(null);

  const [cardForm, setCardForm] = useState<CardFormState>({
    cardholderName: "",
    email: user?.email || "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  useEffect(() => {
    if (user?.email && !cardForm.email) {
      setCardForm((prev) => ({ ...prev, email: user.email }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    const loadPlans = async () => {
      setLoadingPlans(true);
      setPlansError(null);

      try {
        const res = await fetch(`${API_BASE}/pricing/plans`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Unable to load plans (${res.status}).`);
        }

        const data = (await res.json()) as Plan[];
        setPlans(data);
        if (data.length > 0) {
          setSelectedPlanSlug((current) => current || data[0].slug);
        }
      } catch (err: any) {
        setPlansError(err?.message || "Unable to load plans.");
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.slug === selectedPlanSlug) || null,
    [plans, selectedPlanSlug]
  );

  const planPrice = selectedPlan
    ? `${(selectedPlan.price_cents / 100).toFixed(2)} ${selectedPlan.currency} / ${selectedPlan.interval}`
    : "";

  const cardDetailsEntered = Boolean(cardForm.cardNumber && cardForm.expiry && cardForm.cvc);

  const handleCardCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setCardError(null);

    if (!token) {
      setCardError("You must be signed in to continue.");
      return;
    }

    if (!selectedPlanSlug) {
      setCardError("Please select a subscription plan.");
      return;
    }

    if (!cardForm.cardholderName.trim() || !cardForm.email.trim()) {
      setCardError("Please provide cardholder name and email.");
      return;
    }

    if (!cardDetailsEntered) {
      setCardError("Please complete card details before continuing.");
      return;
    }

    setCardSubmitting(true);

    try {
      const successUrl = `${window.location.origin}/#/payment?card=success`;
      const cancelUrl = `${window.location.origin}/#/payment?card=cancelled`;

      const res = await fetch(`${API_BASE}/payments/checkout/card`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          plan_slug: selectedPlanSlug,
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: cardForm.email,
          cardholder_name: cardForm.cardholderName,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as CheckoutResponse & { detail?: string };
      if (!res.ok) {
        throw new Error(data.detail || `Card checkout failed (${res.status}).`);
      }

      if (!data.checkout_url) {
        throw new Error("Checkout URL not returned by card provider.");
      }

      window.location.assign(data.checkout_url);
    } catch (err: any) {
      setCardError(err?.message || "Card checkout failed.");
    } finally {
      setCardSubmitting(false);
    }
  };

  const handleBitcoinCheckout = async () => {
    setBtcError(null);

    if (!token) {
      setBtcError("You must be signed in to continue.");
      return;
    }

    if (!selectedPlanSlug) {
      setBtcError("Please select a subscription plan.");
      return;
    }

    setBtcSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/payments/checkout/bitcoin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ plan_slug: selectedPlanSlug }),
      });

      const data = (await res.json().catch(() => ({}))) as CheckoutResponse & { detail?: string };
      if (!res.ok) {
        throw new Error(data.detail || `Bitcoin checkout failed (${res.status}).`);
      }

      if (!data.checkout_url) {
        throw new Error("Checkout URL not returned by bitcoin provider.");
      }

      window.location.assign(data.checkout_url);
    } catch (err: any) {
      setBtcError(err?.message || "Bitcoin checkout failed.");
    } finally {
      setBtcSubmitting(false);
    }
  };

  return (
    <main className="payment-page">
      <section className="payment-shell">
        <header className="payment-header">
          <p className="pill">Payment Center</p>
          <h1>Choose your subscription and complete payment</h1>
          <p>
            Select a plan first, then choose credit card checkout or bitcoin checkout. Both payment
            methods are processed by separate APIs.
          </p>
        </header>

        <section className="subscription-picker" aria-label="Subscription selection">
          <label htmlFor="plan-select">Subscription plan</label>
          <select
            id="plan-select"
            value={selectedPlanSlug}
            onChange={(e) => setSelectedPlanSlug(e.target.value)}
            disabled={loadingPlans || plans.length === 0}
          >
            {plans.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.name} - {(plan.price_cents / 100).toFixed(2)} {plan.currency}/{plan.interval}
              </option>
            ))}
          </select>
          {loadingPlans ? <p className="status">Loading available plans...</p> : null}
          {plansError ? <p className="error">{plansError}</p> : null}
          {selectedPlan ? (
            <p className="plan-summary">
              Selected: <strong>{selectedPlan.name}</strong> ({planPrice})
            </p>
          ) : null}
        </section>

        <section className="payment-split" aria-label="Payment methods">
          <article className="payment-card-panel">
            <h2>Credit card</h2>
            <p>Enter your card details, then continue to our secure card checkout provider.</p>

            <form onSubmit={handleCardCheckout} className="payment-form">
              <label>
                Cardholder name
                <input
                  type="text"
                  value={cardForm.cardholderName}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, cardholderName: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </label>

              <label>
                Billing email
                <input
                  type="email"
                  value={cardForm.email}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <div className="card-fields-grid">
                <label>
                  Card number
                  <input
                    type="text"
                    value={cardForm.cardNumber}
                    onChange={(e) => setCardForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
                    placeholder="4242 4242 4242 4242"
                    required
                  />
                </label>

                <label>
                  Expiry
                  <input
                    type="text"
                    value={cardForm.expiry}
                    onChange={(e) => setCardForm((prev) => ({ ...prev, expiry: e.target.value }))}
                    placeholder="MM/YY"
                    required
                  />
                </label>

                <label>
                  CVC
                  <input
                    type="text"
                    value={cardForm.cvc}
                    onChange={(e) => setCardForm((prev) => ({ ...prev, cvc: e.target.value }))}
                    placeholder="123"
                    required
                  />
                </label>
              </div>

              <p className="info-note">
                For security and PCI compliance, full card authorization is completed on the external
                checkout page.
              </p>

              {cardError ? <p className="error">{cardError}</p> : null}

              <button type="submit" disabled={cardSubmitting || loadingPlans || !selectedPlanSlug}>
                {cardSubmitting ? "Redirecting..." : "Pay with credit card"}
              </button>
            </form>
          </article>

          <article className="payment-btc-panel">
            <h2>Bitcoin</h2>
            <p>Create a bitcoin invoice and complete checkout through the BTCPay-style endpoint.</p>

            <div className="btc-summary">
              <p>
                Plan: <strong>{selectedPlan?.name || "Select a plan"}</strong>
              </p>
              <p>
                Amount: <strong>{selectedPlan ? planPrice : "-"}</strong>
              </p>
            </div>

            {btcError ? <p className="error">{btcError}</p> : null}

            <button
              type="button"
              className="btc-button"
              disabled={btcSubmitting || loadingPlans || !selectedPlanSlug}
              onClick={handleBitcoinCheckout}
            >
              {btcSubmitting ? "Creating invoice..." : "Pay with bitcoin"}
            </button>
          </article>
        </section>
      </section>
    </main>
  );
}
