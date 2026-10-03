"use client";

import { FormEvent, useEffect, useState } from "react";
import AddressFields from "./components/AddressFields";
import { api, formatAddressLines, type Address, type CustomerCase } from "./lib/api";
import { useSession } from "./lib/session";

type Mode = "choose" | "edit";

function emptyFrom(current: Address): Address {
  return {
    name: current.name || "",
    phone: current.phone || "",
    company: current.company || "",
    address1: current.address1 || "",
    address2: current.address2 || "",
    city: current.city || "",
    state: current.state || "",
    postalCode: current.postalCode || "",
    country: current.country || "US",
  };
}

export default function HomePage() {
  const { loading, error, caseData, sessionId, adoptSession } = useSession();
  const [mode, setMode] = useState<Mode>("choose");
  const [draft, setDraft] = useState<Address | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<CustomerCase | null>(null);

  useEffect(() => {
    if (!caseData) return;
    setDraft(emptyFrom(caseData.currentAddress));
    if (caseData.alreadySubmitted) setDone(caseData);
  }, [caseData]);

  async function submit(responseType: "confirm" | "update", address?: Address) {
    if (!sessionId) return;
    setBusy(true);
    setFormError("");
    try {
      const payload = await api<{ case: CustomerCase }>({
        action: "submitResponse",
        sessionId,
        responseType,
        address,
      });
      adoptSession(sessionId, payload.case);
      setDone(payload.case);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save your response.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    await submit("confirm");
  }

  async function onSaveUpdate(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.address1.trim() || !draft.city.trim() || !draft.postalCode.trim()) {
      setFormError("Enter a complete street, city, and ZIP.");
      return;
    }
    await submit("update", draft);
  }

  if (loading) {
    return (
      <main className="page">
        <div className="page-loader">
          <div className="page-loader-mark">
            <span />
          </div>
          <p>Loading</p>
        </div>
      </main>
    );
  }

  if (done?.alreadySubmitted || done?.status === "submitted") {
    const lines = formatAddressLines(done.submittedAddress || done.currentAddress);
    return (
      <main className="page content-fade">
        <section className="state-card confirm-card">
          <p className="confirm-kicker">All set</p>
          <h1>Thank you</h1>
          <p className="confirm-copy">
            {done.responseType === "update"
              ? "Your updated address is saved. Our team will apply it to your order shortly."
              : "You’re all set — we have your address confirmed for this order."}
          </p>
          {lines.length ? (
            <div className="confirm-address">
              <div className="label">Shipping to</div>
              <div className="confirm-address-lines">
                {lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  if (!caseData || !sessionId) {
    return (
      <main className="page content-fade">
        <section className="state-card">
          <h1>Open your email link</h1>
          <p>
            {error ||
              "This page opens from the unique link in your Bluff shipping email. Use that link so we can load your order."}
          </p>
          <p style={{ marginTop: 18 }}>
            Need help? <a href="mailto:info@gotbluff.com">info@gotbluff.com</a>
          </p>
        </section>
      </main>
    );
  }

  const lines = formatAddressLines(caseData.currentAddress);

  return (
    <main className="page content-fade">
      <section className="hero">
        <p className="eyebrow">Shipping check</p>
        <h1>Confirm your address</h1>
        <p>
          {caseData.flagReason?.customerMessage
            ? caseData.flagReason.customerMessage
            : "We couldn’t validate the shipping address on your order. Confirm it’s correct, or update it so we can get your Bluff package moving."}
        </p>
      </section>

      <section className="panel">
        <div className="order-meta">
          <div>
            <span>Order</span>
            <strong>#{caseData.orderNumber || "—"}</strong>
          </div>
          {caseData.customerName ? (
            <div>
              <span>Ship to</span>
              <strong>{caseData.customerName}</strong>
            </div>
          ) : null}
        </div>

        {caseData.flagReason?.customerMessage ? (
          <div className="flag-banner" role="status">
            <span className="flag-banner-label">Why we’re checking</span>
            <p>{caseData.flagReason.customerMessage}</p>
          </div>
        ) : null}

        <div className="address-block">
          <div className="label">Current address on file</div>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {mode === "choose" ? (
          <>
            <div className="choice-grid">
              <button className="choice" type="button" onClick={() => void onConfirm()} disabled={busy}>
                <strong>Address is correct</strong>
                <span>Keep the address above and let our team release your order.</span>
              </button>
              <button
                className="choice"
                type="button"
                onClick={() => {
                  setMode("edit");
                  setFormError("");
                }}
                disabled={busy}
              >
                <strong>Update address</strong>
                <span>Enter the correct shipping details below.</span>
              </button>
            </div>
            {formError ? <p className="error" style={{ marginTop: 16 }}>{formError}</p> : null}
            {busy ? <p className="address-hint" style={{ marginTop: 16 }}>Saving…</p> : null}
          </>
        ) : (
          <form onSubmit={(event) => void onSaveUpdate(event)}>
            {draft ? (
              <AddressFields
                value={draft}
                confirmed={confirmed}
                onChange={setDraft}
                onConfirmedChange={setConfirmed}
              />
            ) : null}
            {formError ? <p className="error">{formError}</p> : null}
            <div className="actions">
              <button className="primary-btn" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save updated address"}
              </button>
              <button
                className="ghost-btn"
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode("choose");
                  setFormError("");
                  setDraft(emptyFrom(caseData.currentAddress));
                  setConfirmed(false);
                }}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
