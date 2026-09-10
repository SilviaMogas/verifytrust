import { BarretenbergSync } from "@aztec/bb.js";
import {
  bytesToHex,
  hexToBytes,
  keccak256,
  toBytes,
  type Hex,
} from "viem";
import { DOMAIN_CREDENTIAL, DOMAIN_ISSUER, DOMAIN_NULLIFIER } from "./domain.js";
import type { Credential, Hex32 } from "./types.js";

const FIELD_MODULUS =
  0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;

let bbPromise: Promise<BarretenbergSync> | undefined;
const bb = () => {
  bbPromise ??= BarretenbergSync.initSingleton();
  return bbPromise;
};

export const fieldFromString = (label: string): Hex32 => {
  const value = BigInt(keccak256(toBytes(label))) % FIELD_MODULUS;
  return `0x${value.toString(16).padStart(64, "0")}`;
};

export const randomHex32 = (): Hex32 => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let value = BigInt(`0x${bytesToHex(bytes).slice(2)}`) % FIELD_MODULUS;
  if (value === 0n) value = 1n;
  return `0x${value.toString(16).padStart(64, "0")}`;
};

const fieldBytes = (value: bigint | Hex32): Uint8Array => {
  if (typeof value === "bigint") {
    return hexToBytes(`0x${value.toString(16).padStart(64, "0")}`);
  }
  return hexToBytes(value);
};

const hash = async (inputs: (bigint | Hex32 | Uint8Array)[]): Promise<Hex32> => {
  const api = await bb();
  const response = api.poseidon2Hash({
    inputs: inputs.map((input) =>
      input instanceof Uint8Array ? input : fieldBytes(input),
    ),
  });
  return bytesToHex(response.hash) as Hex32;
};

export const computeCredentialCommitment = async (
  credential: Pick<
    Credential,
    "merchantId" | "productId" | "purchaseTimestamp" | "purchaseNonce" | "customerSecret"
  >,
): Promise<Hex32> =>
  hash([
    DOMAIN_CREDENTIAL,
    credential.merchantId,
    credential.productId,
    credential.purchaseTimestamp,
    credential.purchaseNonce,
    credential.customerSecret,
  ]);

export const computeIssuerKeyHash = async (
  publicKey: Credential["issuerPublicKey"],
): Promise<Hex32> => hash([DOMAIN_ISSUER, publicKey.x, publicKey.y]);

export const computeNullifier = async ({
  customerSecret,
  purchaseNonce,
  productId,
}: Pick<Credential, "customerSecret" | "purchaseNonce" | "productId">): Promise<Hex32> =>
  hash([DOMAIN_NULLIFIER, customerSecret, purchaseNonce, productId]);

export const getBarretenberg = bb;
