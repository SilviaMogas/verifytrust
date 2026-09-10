import { describe, expect, it } from "vitest";
import { createIssuer, decodeCredential, encodeCredential } from "./index.js";

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
});
