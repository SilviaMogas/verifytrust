import { describe, expect, it } from "vitest";
import {
  computeCredentialCommitment,
  computeNullifier,
  createReviewCommitment,
  fieldFromString,
  generateProof,
  issueCredential,
  verifyProof,
} from "./index.js";

const vector = {
  merchantId: "0x000000000000000000000000000000000000000000000000000000000000000b" as const,
  productId: "0x0000000000000000000000000000000000000000000000000000000000000016" as const,
  purchaseTimestamp: 33n,
  purchaseNonce: "0x000000000000000000000000000000000000000000000000000000000000002c" as const,
  customerSecret: "0x0000000000000000000000000000000000000000000000000000000000000037" as const,
};

describe("cryptographic helpers", () => {
  it("matches the Noir vector commitment and nullifier", async () => {
    expect(await computeCredentialCommitment(vector)).toBe(
      "0x00bc6420b78d7ac7d510310f42b3a5eb597b0e46c73ed4e4d2374faee5a8f5af",
    );
    expect(await computeNullifier(vector)).toBe(
      "0x2ba61bf5921cc0778266a61fae59df0d767602e9c5ff2588bde14c2471b0e4d9",
    );
  });

  it("derives field identifiers", () => {
    expect(fieldFromString("nova-goods")).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("proof workflow", () => {
  it("issues, proves, and verifies", async () => {
    const credential = await issueCredential({
      ...vector,
      issuerPrivateKey: "0x" + "42".padStart(64, "0") as `0x${string}`,
    });
    const proof = await generateProof(credential);
    expect(await verifyProof(proof)).toBe(true);
    const tampered = { ...proof, proof: (`0x${proof.proof.slice(4)}00`) as `0x${string}` };
    expect(await verifyProof(tampered)).toBe(false);
  });
});

describe("review commitments", () => {
  it("is deterministic with a fixed salt and changes otherwise", () => {
    const salt = `0x${"11".repeat(32)}` as `0x${string}`;
    const first = createReviewCommitment({ reviewText: "Excellent", rating: 5, salt });
    const second = createReviewCommitment({ reviewText: "Excellent", rating: 5, salt });
    const different = createReviewCommitment({ reviewText: "Excellent", rating: 5 });
    expect(first).toEqual(second);
    expect(different.commitment).not.toBe(first.commitment);
  });
});
