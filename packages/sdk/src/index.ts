export * from "./chain.js";
export * from "./crypto.js";
export * from "./deployments.js";
export * from "./domain.js";
export * from "./proof.js";
export * from "./review.js";
export * from "./types.js";
export { createPublicClient, createWalletClient, defineChain, http } from "viem";
export { privateKeyToAccount } from "viem/accounts";
export { sepolia } from "viem/chains";

import { getBarretenberg } from "./crypto.js";
import { computeCredentialCommitment, randomHex32 } from "./crypto.js";
import { bytesToHex, hexToBytes } from "viem";
import type { Credential, Hex32 } from "./types.js";

export const issueCredential = async ({
  merchantId,
  productId,
  purchaseTimestamp,
  issuerPrivateKey,
  customerSecret,
}: {
  merchantId: Hex32;
  productId: Hex32;
  purchaseTimestamp: bigint;
  issuerPrivateKey: Hex32;
  customerSecret?: Hex32;
}): Promise<Credential> => {
  const api = await getBarretenberg();
  const nonce = randomHex32();
  const secret = customerSecret ?? randomHex32();
  const publicKey = api.schnorrComputePublicKey({
    privateKey: hexToBytes(issuerPrivateKey),
  });
  const credential = {
    merchantId,
    productId,
    purchaseTimestamp,
    purchaseNonce: nonce,
    customerSecret: secret,
    issuerPublicKey: {
      x: bytesToHex(publicKey.publicKey.x) as Hex32,
      y: bytesToHex(publicKey.publicKey.y) as Hex32,
    },
    signature: "0x" as `0x${string}`,
    protocolVersion: 1 as const,
  };
  const commitment = await computeCredentialCommitment(credential);
  const signature = api.schnorrConstructSignature({
    messageField: hexToBytes(commitment),
    privateKey: hexToBytes(issuerPrivateKey),
  });
  credential.signature = bytesToHex(new Uint8Array([...signature.s, ...signature.e]));
  return credential;
};
