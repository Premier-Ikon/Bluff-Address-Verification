"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Address } from "../lib/api";

type Suggestion = { placeId: string; description: string };

type Props = {
  value: Address;
  confirmed: boolean;
  onChange: (next: Address) => void;
  onConfirmedChange: (confirmed: boolean) => void;
};

export default function AddressFields({ value, confirmed, onChange, onConfirmedChange }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const query = value.address1.trim();
    if (confirmed) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setHint("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/address/suggest?q=${encodeURIComponent(query)}`)
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok || payload.success === false) {
            throw new Error(payload.error || "Could not look up addresses.");
          }
          return payload as { suggestions: Suggestion[] };
        })
        .then((payload) => {
          if (cancelled) return;
          setSuggestions(payload.suggestions || []);
          setOpen(Boolean(payload.suggestions?.length));
          setHint("");
        })
        .catch((err) => {
          if (cancelled) return;
          setSuggestions([]);
          setOpen(false);
          setHint(err instanceof Error ? err.message : "Could not look up addresses.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value.address1, confirmed]);

  function patch(partial: Partial<Address>, keepConfirmed = false) {
    onChange({ ...value, ...partial });
    if (!keepConfirmed) onConfirmedChange(false);
  }

  async function chooseSuggestion(suggestion: Suggestion) {
    setConfirming(true);
    setHint("");
    try {
      const response = await fetch("/api/address/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.placeId }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Could not confirm that address.");
      }
      const next = payload.address as {
        address: string;
        address2: string;
        city: string;
        region: string;
        postal: string;
        country: string;
      };
      onChange({
        ...value,
        address1: next.address || "",
        address2: value.address2 || next.address2 || "",
        city: next.city || "",
        state: next.region || "",
        postalCode: next.postal || "",
        country: next.country === "United States" ? "US" : next.country || "US",
      });
      onConfirmedChange(true);
      setSuggestions([]);
      setOpen(false);
    } catch (err) {
      onConfirmedChange(false);
      setHint(err instanceof Error ? err.message : "Could not confirm that address.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="edit-form" ref={rootRef}>
      <label>
        Full name
        <input
          value={value.name}
          onChange={(event) => patch({ name: event.target.value }, confirmed)}
          autoComplete="name"
          required
        />
      </label>

      <div className="address-field">
        <label htmlFor={`${listId}-address`}>Street address</label>
        <div className="address-input-wrap">
          <input
            id={`${listId}-address`}
            value={value.address1}
            onChange={(event) => patch({ address1: event.target.value })}
            onFocus={() => {
              if (suggestions.length) setOpen(true);
            }}
            placeholder="Start typing your address"
            autoComplete="shipping address-line1"
            required
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
          />
          {open && suggestions.length ? (
            <ul className="address-suggestions" id={listId} role="listbox">
              {suggestions.map((suggestion) => (
                <li key={suggestion.placeId}>
                  <button type="button" onClick={() => void chooseSuggestion(suggestion)}>
                    {suggestion.description}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="address-status">
          {confirming || loading ? <span className="address-hint">Checking address…</span> : null}
          {!confirming && !loading && confirmed ? (
            <span className="address-confirmed">Address confirmed</span>
          ) : null}
          {!confirming && !loading && !confirmed && hint ? (
            <span className="address-hint is-error">{hint}</span>
          ) : null}
          {!confirming && !loading && !confirmed && !hint && value.address1.trim().length >= 3 ? (
            <span className="address-hint">Select a suggestion to confirm the address</span>
          ) : null}
        </div>
      </div>

      <label>
        Apt, suite, etc.
        <input
          value={value.address2}
          onChange={(event) => patch({ address2: event.target.value }, confirmed)}
          placeholder="Optional"
          autoComplete="shipping address-line2"
        />
      </label>

      <label>
        City
        <input
          value={value.city}
          onChange={(event) => patch({ city: event.target.value })}
          required
          autoComplete="shipping address-level2"
        />
      </label>

      <div className="form-grid">
        <label>
          State
          <input
            value={value.state}
            onChange={(event) => patch({ state: event.target.value })}
            autoComplete="shipping address-level1"
            required
          />
        </label>
        <label>
          ZIP code
          <input
            value={value.postalCode}
            onChange={(event) => patch({ postalCode: event.target.value })}
            autoComplete="shipping postal-code"
            required
          />
        </label>
      </div>

      <label>
        Phone
        <input
          value={value.phone}
          onChange={(event) => patch({ phone: event.target.value }, confirmed)}
          autoComplete="tel"
          placeholder="Optional"
        />
      </label>
    </div>
  );
}
