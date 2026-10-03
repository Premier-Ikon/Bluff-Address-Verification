"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type CustomerCase } from "../../lib/api";
import { useSession } from "../../lib/session";

// Survives React Strict Mode remounts in development.
const inFlight = new Map<string, Promise<{ sessionId: string; case: CustomerCase }>>();

export default function OrderEntryPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const { adoptSession } = useSession();
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = String(params?.orderNumber || "").trim();
    const orderNumber = decodeURIComponent(raw).replace(/^#/, "").trim();
    if (!orderNumber) {
      setError("This link is missing an order number.");
      return;
    }

    let cancelled = false;
    const key = orderNumber.toUpperCase();
    let request = inFlight.get(key);
    if (!request) {
      request = api<{ sessionId: string; case: CustomerCase }>({
        action: "openByOrderNumber",
        orderNumber,
      }).finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, request);
    }

    request
      .then((payload) => {
        if (cancelled) return;
        adoptSession(payload.sessionId, payload.case);
        router.replace("/");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "We could not open this order.");
      });

    return () => {
      cancelled = true;
    };
  }, [params?.orderNumber, adoptSession, router]);

  if (error) {
    return (
      <main className="page content-fade">
        <section className="state-card">
          <h1>Order not found</h1>
          <p>{error}</p>
          <p style={{ marginTop: 18 }}>
            Email <a href="mailto:info@gotbluff.com">info@gotbluff.com</a> with your order number and
            we’ll help from there.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-loader">
        <div className="page-loader-mark">
          <span />
        </div>
        <p>Opening your order</p>
      </div>
    </main>
  );
}
