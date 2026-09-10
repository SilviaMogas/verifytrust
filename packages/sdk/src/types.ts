import type { Address, PublicClient, WalletClient } from "viem";

export type Hex = `0x${string}`;
export type Hex32 = `0x${string}`;

export type Credential = {
  merchantId: Hex32;
  productId: Hex32;
  purchaseTimestamp: bigint;
  purchaseNonce: Hex32;
  customerSecret: Hex32;
  issuerPublicKey: { x: Hex32; y: Hex32 };
  signature: Hex;
  protocolVersion: 1;
};

export type ProofOfReview = {
  proof: Hex;
  publicInputs: [Hex32, Hex32, Hex32, Hex32, Hex32];
  nullifier: Hex32;
};

export type ReviewVerification = {
  reviewCommitment: Hex32;
  productId: Hex32;
  merchantId: Hex32;
  nullifier: Hex32;
  verifiedAt: bigint;
};

export type ReviewCommitment = {
  commitment: Hex32;
  salt: Hex32;
};

export type ChainClient = {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  registryAddress: Address;
};
