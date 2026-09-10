import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { bytesToHex, hexToBytes } from "viem";
import circuit from "../../circuits/target/proof_of_review.json" with { type: "json" };
import { computeCredentialCommitment, computeIssuerKeyHash, computeNullifier } from "./crypto.js";
import type { Credential, Hex32, ProofOfReview } from "./types.js";

let backendPromise: Promise<UltraHonkBackend> | undefined;
const backend = () => {
  backendPromise ??= Barretenberg.initSingleton().then(
    (api) => new UltraHonkBackend(circuit.bytecode, api),
  );
  return backendPromise;
};

const inputsFor = async (credential: Credential) => {
  const issuerKeyHash = await computeIssuerKeyHash(credential.issuerPublicKey);
  const nullifier = await computeNullifier(credential);
  const commitment = await computeCredentialCommitment(credential);
  return {
    issuerKeyHash,
    nullifier,
    commitment,
    inputs: {
      merchant_id: credential.merchantId,
      product_id: credential.productId,
      purchase_timestamp: `0x${credential.purchaseTimestamp.toString(16).padStart(64, "0")}`,
      purchase_nonce: credential.purchaseNonce,
      customer_secret: credential.customerSecret,
      issuer_pk_x: credential.issuerPublicKey.x,
      issuer_pk_y: credential.issuerPublicKey.y,
      signature: Array.from(hexToBytes(credential.signature)),
      pub_merchant_id: credential.merchantId,
      pub_product_id: credential.productId,
      pub_issuer_key_hash: issuerKeyHash,
      pub_nullifier: nullifier,
      pub_protocol_version: "0x01",
    },
  };
};

export const generateProof = async (credential: Credential): Promise<ProofOfReview> => {
  const noir = new Noir(circuit as any);
  const { inputs, issuerKeyHash, nullifier } = await inputsFor(credential);
  const { witness } = await noir.execute(inputs);
  const proofData = await (await backend()).generateProof(witness, {
    verifierTarget: "evm",
  });
  return {
    proof: bytesToHex(proofData.proof),
    publicInputs: proofData.publicInputs as [
      Hex32,
      Hex32,
      Hex32,
      Hex32,
      Hex32,
    ],
    nullifier,
  };
};

export const verifyProof = async (proof: ProofOfReview): Promise<boolean> => {
  try {
    return await (await backend()).verifyProof(
      {
        proof: hexToBytes(proof.proof),
        publicInputs: proof.publicInputs,
      },
      { verifierTarget: "evm" },
    );
  } catch {
    return false;
  }
};
