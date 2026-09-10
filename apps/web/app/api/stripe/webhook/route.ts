import { verifyStripeWebhookSignature } from "@verifytrust/merchant-sdk";
import { NextResponse } from "next/server";
import { recordPaidSession } from "../../../../lib/store";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        code: "webhook_not_configured",
        message: "Stripe webhook is not configured.",
      },
      { status: 503 },
    );
  }
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!verifyStripeWebhookSignature(payload, signature, secret)) {
    return NextResponse.json(
      { code: "invalid_signature", message: "Invalid webhook signature." },
      { status: 400 },
    );
  }
  let event: {
    type?: string;
    data?: { object?: { id?: string; payment_status?: string } };
  };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json(
      { code: "invalid_payload", message: "Invalid webhook payload." },
      { status: 400 },
    );
  }
  const session = event.data?.object;
  if (
    event.type === "checkout.session.completed" &&
    session?.payment_status === "paid" &&
    session.id
  ) {
    await recordPaidSession({
      sessionId: session.id,
      paidAt: new Date().toISOString(),
    });
  }
  return NextResponse.json({ received: true });
}
