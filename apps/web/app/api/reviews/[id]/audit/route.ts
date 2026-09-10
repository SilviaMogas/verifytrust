import { getReview } from "../../../../../lib/store";
import { createReviewCommitment, verifyTrustRegistryAbi } from "@verifytrust/sdk";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  decodeFunctionData,
  defineChain,
  http,
} from "viem";
import { sepolia } from "viem/chains";

type AuditRouteProps = {
  params: Promise<{ id: string }>;
};

const clientFor = (chainId: number, rpcUrl: string) =>
  createPublicClient({
    chain:
      chainId === 11155111
        ? sepolia
        : defineChain({
            id: chainId,
            name: "VerifyTrust network",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: [rpcUrl] } },
          }),
    transport: http(rpcUrl),
  });

export async function GET(
  _request: Request,
  { params }: AuditRouteProps,
) {
  const { id } = await params;
  const review = await getReview(id);
  if (!review) {
    return NextResponse.json({ code: "not_found" }, { status: 404 });
  }
  if (!review.txHash) {
    return NextResponse.json(
      { code: "audit_unavailable", message: "Audit data is not available." },
      { status: 503 },
    );
  }

  const rpcUrl =
    process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
  const client = clientFor(review.chainId, rpcUrl);
  let publicInputs = review.publicInputs;
  let blockNumber = review.blockNumber;
  let verifiedAt = review.verifiedAt;

  try {
    const transaction = await client.getTransaction({
      hash: review.txHash as `0x${string}`,
    });
    if (!publicInputs) {
      const decoded = decodeFunctionData({
        abi: verifyTrustRegistryAbi,
        data: transaction.input,
      });
      const args = decoded.args as [
        `0x${string}`,
        [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
        `0x${string}`,
      ];
      publicInputs = args[1];
    }
    if (!blockNumber) {
      const receipt = await client.getTransactionReceipt({
        hash: review.txHash as `0x${string}`,
      });
      blockNumber = Number(receipt.blockNumber);
    }
    if (!verifiedAt && publicInputs) {
      const verification = await client.readContract({
        address: review.contractAddress as `0x${string}`,
        abi: verifyTrustRegistryAbi,
        functionName: "getVerification",
        args: [publicInputs[3] as `0x${string}`],
      });
      verifiedAt = Number(verification[4]);
    }
  } catch {
    return NextResponse.json(
      { code: "audit_unavailable", message: "Audit data is not available." },
      { status: 503 },
    );
  }

  if (!publicInputs || blockNumber === undefined) {
    return NextResponse.json(
      { code: "audit_unavailable", message: "Audit data is not available." },
      { status: 503 },
    );
  }
  const recomputedCommitmentMatches = review.salt
    ? createReviewCommitment({
        reviewText: JSON.stringify({
          title: review.title,
          body: review.body,
          publicIdentity: review.publicIdentity,
        }),
        rating: review.rating,
        salt: review.salt as `0x${string}`,
      }).commitment.toLowerCase() === review.reviewCommitment.toLowerCase()
    : false;

  return NextResponse.json({
    reviewCommitment: review.reviewCommitment,
    publicInputs: {
      merchantId: publicInputs[0],
      productId: publicInputs[1],
      issuerKeyHash: publicInputs[2],
      nullifier: publicInputs[3],
      protocolVersion: publicInputs[4],
    },
    txHash: review.txHash,
    blockNumber,
    network: review.network,
    registryAddress: review.contractAddress,
    verifiedAt,
    recomputedCommitmentMatches,
  });
}
