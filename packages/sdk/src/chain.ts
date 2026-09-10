import { parseAbi } from "viem";
import type { ChainClient, Hex32, ProofOfReview, ReviewVerification } from "./types.js";

export const verifyTrustRegistryAbi = parseAbi([
  "function submitVerifiedReview(bytes proof, bytes32[] publicInputs, bytes32 reviewCommitment) returns (bytes32)",
  "function isNullifierUsed(bytes32) view returns (bool)",
  "function verificationCount() view returns (uint256)",
  "function getVerification(bytes32) view returns (bytes32 reviewCommitment, bytes32 productId, bytes32 merchantId, bytes32 nullifier, uint256 verifiedAt)",
  "error NullifierAlreadyUsed(bytes32)",
]);

export const issuerRegistryAbi = parseAbi([
  "function approveIssuer(bytes32 merchantId, bytes32 issuerKeyHash)",
  "function revokeIssuer(bytes32 merchantId, bytes32 issuerKeyHash)",
  "function isApprovedIssuer(bytes32 merchantId, bytes32 issuerKeyHash) view returns (bool)",
]);

export const proofOfReviewVerifierAbi = parseAbi([
  "function verify(bytes proof, bytes32[] publicInputs) view returns (bool)",
]);

export const submitVerifiedReview = async ({
  proof,
  reviewCommitment,
  client,
}: {
  proof: ProofOfReview;
  reviewCommitment: Hex32;
  client: ChainClient;
}) => {
  if (!client.walletClient) throw new Error("A wallet client is required to submit a review");
  const hash = await client.walletClient.writeContract({
    account: client.walletClient.account!,
    address: client.registryAddress,
    abi: verifyTrustRegistryAbi,
    functionName: "submitVerifiedReview",
    args: [proof.proof, proof.publicInputs, reviewCommitment],
    chain: client.walletClient.chain,
  });
  return client.publicClient.waitForTransactionReceipt({ hash });
};

export const checkNullifier = async (
  nullifier: Hex32,
  client: ChainClient,
): Promise<boolean> =>
  client.publicClient.readContract({
    address: client.registryAddress,
    abi: verifyTrustRegistryAbi,
    functionName: "isNullifierUsed",
    args: [nullifier],
  });

export const getVerification = async (
  nullifier: Hex32,
  client: ChainClient,
): Promise<ReviewVerification> => {
  const value = await client.publicClient.readContract({
    address: client.registryAddress,
    abi: verifyTrustRegistryAbi,
    functionName: "getVerification",
    args: [nullifier],
  });
  return {
    reviewCommitment: value[0],
    productId: value[1],
    merchantId: value[2],
    nullifier: value[3],
    verifiedAt: value[4],
  };
};
