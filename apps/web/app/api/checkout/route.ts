import { NextResponse } from "next/server";
import { createCheckoutSession, StripeUnavailableError } from "../../../lib/stripe";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_product", message: "That product is not available for checkout." },
      { status: 400 },
    );
  }
  if (
    body === null ||
    typeof body !== "object" ||
    !("productSlug" in body) ||
    body.productSlug !== "verified-membership"
  ) {
    return NextResponse.json(
      { code: "invalid_product", message: "That product is not available for checkout." },
      { status: 400 },
    );
  }
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.headers.get("origin") ||
    new URL(request.url).origin;
  try {
    const session = await createCheckoutSession({
      origin: configuredOrigin,
      merchantSlug: "longhand",
      productSlug: "verified-membership",
    });
    if (!session.url) {
      return NextResponse.json(
        { code: "payment_unavailable", message: "Payment is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeUnavailableError) {
      return NextResponse.json(
        { code: "payment_unavailable", message: "Payment is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { code: "payment_unavailable", message: "Payment is temporarily unavailable." },
      { status: 503 },
    );
  }
}
