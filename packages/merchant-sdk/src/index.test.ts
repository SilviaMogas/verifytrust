import { describe, expect, it } from "vitest";
import {
  createIssuer,
  decodeCredential,
  encodeCredential,
  verifyStripeWebhookSignature,
} from "./index.js";
import { createHmac } from "node:crypto";

describe("merchant issuer", () => {
  it("issues and round-trips an encoded credential", async () => {
    const issuer = await createIssuer({
      privateKey: `0x${"42".padStart(64, "0")}`,
    });
    const credential = await issuer.issue({
      merchantId: `0x${"0".repeat(62)}0b`,
      productId: `0x${"0".repeat(62)}16`,
      purchaseTimestamp: 33n,
      customerSecret: `0x${"0".repeat(62)}37`,
    });
    const decoded = decodeCredential(encodeCredential(credential));
    expect(decoded).toEqual(credential);
    expect(issuer.issuerKeyHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("verifies Stripe webhook signatures with tolerance and tamper protection", () => {
    const payload = '{"type":"checkout.session.completed"}';
    const secret = "whsec_test";
    const timestamp = 1_700_000_000;
    const digest = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const signature = `t=${timestamp},v1=${digest}`;

    expect(
      verifyStripeWebhookSignature(payload, signature, secret, timestamp),
    ).toBe(true);
    expect(
      verifyStripeWebhookSignature(
        `${payload}.tampered`,
        signature,
        secret,
        timestamp,
      ),
    ).toBe(false);
    expect(
      verifyStripeWebhookSignature(payload, signature, secret, timestamp + 301),
    ).toBe(false);
  });
});
