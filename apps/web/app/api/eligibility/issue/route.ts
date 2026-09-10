import { NextResponse } from "next/server";
import { fieldFromString, issueCredential } from "@verifytrust/sdk";
import {
  retrieveCheckoutSession,
  updateSessionMetadata,
} from "../../../../lib/stripe";
import { rateLimit } from "../../../../lib/ratelimit";

const DEV_ISSUER_KEY = `0x${"42".padStart(64, "0")}` as `0x${string}`;
const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;

const customerError = (code: string, message: string, status: number) =>
  NextResponse.json({ code, message }, { status });

export async function POST(request: Request) {
  if (!(await rateLimit(request, "eligibility/issue"))) {
    return customerError(
      "rate_limited",
      "Too many requests. Please try again shortly.",
      429,
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return customerError(
      "invalid_eligibility",
      "The eligibility details are not valid.",
      400,
    );
  }
  if (
    body === null ||
    typeof body !== "object" ||
    !("sessionId" in body) ||
    !("customerSecret" in body) ||
    typeof body.sessionId !== "string" ||
    typeof body.customerSecret !== "string" ||
    !bytes32Pattern.test(body.customerSecret)
  ) {
    return customerError(
      "invalid_eligibility",
      "The eligibility details are not valid.",
      400,
    );
  }
  let session;
  try {
    session = await retrieveCheckoutSession(body.sessionId);
  } catch {
    return customerError(
      "payment_not_confirmed",
      "Payment not confirmed.",
      400,
    );
  }
  const paid = session.payment_status === "paid";
  if (!paid) {
    return customerError(
      "payment_not_confirmed",
      "Payment not confirmed.",
      400,
    );
  }
  if (Date.now() / 1000 - session.created >= 24 * 60 * 60) {
    return customerError(
      "eligibility_expired",
      "This eligibility token has expired.",
      400,
    );
  }
  if (session.metadata?.credential_issued === "true") {
    return customerError(
      "eligibility_already_used",
      "This eligibility has already been used.",
      409,
    );
  }
  if (session.metadata?.productSlug !== "verified-membership") {
    return customerError(
      "invalid_eligibility",
      "This payment is not eligible for a Longhand review.",
      400,
    );
  }
  let metadataUpdated = false;
  try {
    await updateSessionMetadata(body.sessionId, {
      credential_issued: "true",
      issued_at: new Date().toISOString(),
    });
    metadataUpdated = true;
    const chainId = Number(process.env.CHAIN_ID || 31337);
    const issuerKey =
      process.env.DEMO_ISSUER_PRIVATE_KEY ??
      (chainId === 31337 ? DEV_ISSUER_KEY : undefined);
    if (!issuerKey) {
      return customerError(
        "credential_issuance_failed",
        "We could not issue your private purchase credential.",
        503,
      );
    }
    const credential = await issueCredential({
      merchantId: fieldFromString("longhand"),
      productId: fieldFromString("longhand-verified-membership"),
      purchaseTimestamp: BigInt(session.created),
      customerSecret: body.customerSecret as `0x${string}`,
      issuerPrivateKey: issuerKey as `0x${string}`,
    });
    return NextResponse.json({
      credential: {
        ...credential,
        purchaseTimestamp: credential.purchaseTimestamp.toString(),
      },
      provenance: "stripe",
    });
  } catch {
    if (metadataUpdated) {
      try {
        await updateSessionMetadata(body.sessionId, {
          credential_issued: "false",
          issued_at: "",
        });
      } catch {
        // Best effort: preserve the customer-safe issuance error.
      }
    }
    return customerError(
      "credential_issuance_failed",
      "We could not issue your private purchase credential.",
      503,
    );
  }
}
