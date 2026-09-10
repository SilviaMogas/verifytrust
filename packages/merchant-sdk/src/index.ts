import {
  bytesToHex,
  hexToBytes,
  type Hex,
} from "viem";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  computeIssuerKeyHash,
  getBarretenberg,
  issueCredential,
  randomHex32,
  type Credential,
  type Hex32,
} from "@verifytrust/sdk";

export type { Credential, Hex, Hex32 };

export function verifyStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
  tolerance = 300,
): boolean {
  const parts = signature.split(",").map((part) => part.trim());
  const timestamp = Number(parts.find((part) => part.startsWith("t="))?.slice(2));
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > tolerance) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest();
  return parts
    .filter((part) => part.startsWith("v1="))
    .some((part) => {
      const value = part.slice(3);
      if (!/^[0-9a-fA-F]{64}$/.test(value)) return false;
      const received = Buffer.from(value, "hex");
      return received.length === expected.length && timingSafeEqual(received, expected);
    });
}

export type Purchase = {
  merchantId: Hex32;
  productId: Hex32;
  purchaseTimestamp: bigint;
  customerSecret?: Hex32;
};

export type IssuerKey = {
  privateKey: Hex32;
  publicKey: { x: Hex32; y: Hex32 };
  issuerKeyHash: Hex32;
};

export type Issuer = {
  publicKey: IssuerKey["publicKey"];
  issuerKeyHash: Hex32;
  issue: (purchase: Purchase) => Promise<Credential>;
};

export const generateIssuerKey = async (): Promise<IssuerKey> => {
  const privateKey = randomHex32();
  const api = await getBarretenberg();
  const publicKey = api.schnorrComputePublicKey({
    privateKey: hexToBytes(privateKey),
  }).publicKey;
  const normalized = {
    x: bytesToHex(publicKey.x) as Hex32,
    y: bytesToHex(publicKey.y) as Hex32,
  };
  return {
    privateKey,
    publicKey: normalized,
    issuerKeyHash: await computeIssuerKeyHash(normalized),
  };
};

export const createIssuer = async (options: { privateKey?: Hex32 } = {}): Promise<Issuer> => {
  const privateKey = options.privateKey ?? randomHex32();
  const api = await getBarretenberg();
  const point = api.schnorrComputePublicKey({
    privateKey: hexToBytes(privateKey),
  }).publicKey;
  const publicKey = {
    x: bytesToHex(point.x) as Hex32,
    y: bytesToHex(point.y) as Hex32,
  };
  const issuerKeyHash = await computeIssuerKeyHash(publicKey);
  return {
    publicKey,
    issuerKeyHash,
    issue: (purchase) =>
      issueCredential({
        ...purchase,
        issuerPrivateKey: privateKey,
      }),
  };
};

const encodeBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const decodeBase64Url = (value: string): string => {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
};

export const encodeCredential = (credential: Credential): string =>
  encodeBase64Url(
    JSON.stringify({
      ...credential,
      purchaseTimestamp: credential.purchaseTimestamp.toString(),
    }),
  );

export const decodeCredential = (encoded: string): Credential => {
  const parsed = JSON.parse(decodeBase64Url(encoded));
  return {
    ...parsed,
    purchaseTimestamp: BigInt(parsed.purchaseTimestamp),
  } as Credential;
};
