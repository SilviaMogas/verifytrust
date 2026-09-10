"use client";

import { useState } from "react";

export function PayButton({
  productSlug,
  children,
}: {
  productSlug: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productSlug }),
      });
      const body = (await response.json()) as { url?: string; code?: string };
      if (!response.ok || !body.url) {
        setError(
          body.code === "payment_unavailable"
            ? "Payment is temporarily unavailable. Please try again later."
            : "Checkout could not be started. Please try again.",
        );
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Checkout could not be started. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pay-button-wrap">
      <button className="button" disabled={busy} onClick={startCheckout}>
        {busy ? "Opening checkout…" : children}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
