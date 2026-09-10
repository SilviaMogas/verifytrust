type StripeMetadata = Record<string, string>;

export type CheckoutSession = {
  id: string;
  url?: string;
  status?: string;
  payment_status?: string;
  created: number;
  metadata?: StripeMetadata;
};

export class StripeUnavailableError extends Error {
  constructor() {
    super("payment unavailable");
    this.name = "StripeUnavailableError";
  }
}

function requireSecret() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new StripeUnavailableError();
  return secret;
}

async function stripeRequest<T>(endpoint: string, params?: URLSearchParams): Promise<T> {
  const secret = requireSecret();
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: params ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      ...(params ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("stripe request failed");
  return (await response.json()) as T;
}

export async function createCheckoutSession({
  origin,
  merchantSlug,
  productSlug,
}: {
  origin: string;
  merchantSlug: string;
  productSlug: string;
}) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", "100");
  params.set(
    "line_items[0][price_data][product_data][name]",
    "Longhand Verified Membership",
  );
  params.set(
    "success_url",
    `${origin}/review/success?session_id={CHECKOUT_SESSION_ID}`,
  );
  params.set("cancel_url", `${origin}/review/cancelled`);
  params.set("metadata[merchantSlug]", merchantSlug);
  params.set("metadata[productSlug]", productSlug);
  return stripeRequest<CheckoutSession>("checkout/sessions", params);
}

export function retrieveCheckoutSession(id: string) {
  return stripeRequest<CheckoutSession>(
    `checkout/sessions/${encodeURIComponent(id)}`,
  );
}

export function updateSessionMetadata(id: string, metadata: StripeMetadata) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value);
  }
  return stripeRequest<CheckoutSession>(
    `checkout/sessions/${encodeURIComponent(id)}`,
    params,
  );
}
