"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type CustomerCase } from "../../lib/api";
import { useSession } from "../../lib/session";

export default function RedeemPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { adoptSession } = useSession();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = String(params?.token || "").trim();
    if (!token) {
      setError("This link is missing a verification token.");
      return;
    }

    let cancelled = false;
    api<{ sessionId: string; case: CustomerCase }>({ action: "redeemToken", token })
      .then((payload) => {
        if (cancelled) return;
        adoptSession(payload.sessionId, payload.case);
        router.replace("/");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "This link is invalid or expired.");
      });

    return () => {
      cancelled = true;
    };
  }, [params?.token, adoptSession, router]);

  if (error) {
    return (
      <main className="page content-fade">
        <section className="state-card">
          <h1>Link unavailable</h1>
          <p>{error}</p>
          <p style={{ marginTop: 18 }}>
            Email <a href="mailto:info@gotbluff.com">info@gotbluff.com</a> and we’ll help from there.
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
