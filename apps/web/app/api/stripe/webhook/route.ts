import { verifyStripeWebhookSignature } from "@verifytrust/merchant-sdk";
import { NextResponse } from "next/server";
import { BodyLimitError, readBodyLimited } from "../../../../lib/body";
import { recordPaidSession } from "../../../../lib/store";

const maxBodyBytes = 64 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return NextResponse.json(
      { code: "payload_too_large", message: "Webhook payload is too large." },
      { status: 413 },
    );
  }
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
  let payload: string;
  try {
    payload = await readBodyLimited(request, maxBodyBytes);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return NextResponse.json(
        { code: "payload_too_large", message: "Webhook payload is too large." },
        { status: 413 },
      );
    }
    return NextResponse.json(
      { code: "invalid_payload", message: "Invalid webhook payload." },
      { status: 400 },
    );
  }
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
