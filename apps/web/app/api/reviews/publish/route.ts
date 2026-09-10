import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createReviewCommitment } from "@verifytrust/sdk";
import { recordDuplicateAttempt, saveReview } from "../../../../lib/store";
import { submitToRelayer } from "../../../../lib/relayer";
import { rateLimit } from "../../../../lib/ratelimit";

const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;
const proofPattern = /^0x[0-9a-fA-F]+$/;

const errorResponse = (code: string, message: string, status: number) =>
  NextResponse.json({ code, message }, { status });

export async function POST(request: Request) {
  if (!(await rateLimit(request, "reviews/publish"))) {
    return errorResponse(
      "rate_limited",
      "Too many requests. Please try again shortly.",
      429,
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "review_publication_failed",
      "Review publication failed. Please try again.",
      400,
    );
  }
  if (body === null || typeof body !== "object") {
    return errorResponse(
      "review_publication_failed",
      "Review publication failed. Please try again.",
      400,
    );
  }
  const value = body as Record<string, unknown>;
  const rating = value.rating;
  const title = value.title;
  const reviewBody = value.body;
  const publicIdentity = value.publicIdentity;
  if (
    !Number.isInteger(rating) ||
    (rating as number) < 1 ||
    (rating as number) > 5 ||
    typeof title !== "string" ||
    title.length > 120 ||
    typeof reviewBody !== "string" ||
    reviewBody.length < 20 ||
    reviewBody.length > 2000 ||
    typeof publicIdentity !== "string" ||
    publicIdentity.length > 40 ||
    typeof value.proof !== "string" ||
    !proofPattern.test(value.proof) ||
    !Array.isArray(value.publicInputs) ||
    value.publicInputs.length !== 5 ||
    !value.publicInputs.every(
      (item) => typeof item === "string" && bytes32Pattern.test(item),
    ) ||
    typeof value.reviewCommitment !== "string" ||
    !bytes32Pattern.test(value.reviewCommitment) ||
    typeof value.salt !== "string" ||
    !bytes32Pattern.test(value.salt)
  ) {
    return errorResponse(
      "review_publication_failed",
      "Review publication failed. Please check your review details.",
      400,
    );
  }
  const reviewText = JSON.stringify({
    title,
    body: reviewBody,
    publicIdentity,
  });
  let commitment: ReturnType<typeof createReviewCommitment>;
  try {
    commitment = createReviewCommitment({
      reviewText,
      rating: rating as number,
      salt: value.salt as `0x${string}`,
    });
  } catch {
    return errorResponse(
      "review_publication_failed",
      "Review publication failed. Please try again.",
      400,
    );
  }
  if (
    commitment.commitment.toLowerCase() !==
    (value.reviewCommitment as string).toLowerCase()
  ) {
    return errorResponse(
      "review_publication_failed",
      "Review publication failed because the review proof did not match.",
      400,
    );
  }
  const publicInputs = value.publicInputs as [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
  ];
  const result = await submitToRelayer({
    proof: value.proof as `0x${string}`,
    publicInputs,
    reviewCommitment: value.reviewCommitment as `0x${string}`,
  });
  if (result.kind === "not_configured") {
    return errorResponse(
      "ethereum_unavailable",
      "Ethereum verification is unavailable right now.",
      503,
    );
  }
  if (result.kind === "rpc_error") {
    return errorResponse(
      "relayer_unavailable",
      "The verification service is temporarily unavailable.",
      502,
    );
  }
  if (result.kind === "duplicate") {
    await recordDuplicateAttempt(publicInputs[3]);
    return errorResponse(
      "duplicate_review",
      "This purchase has already been used for a verified review.",
      409,
    );
  }
  if (result.kind === "reverted") {
    return errorResponse(
      "review_publication_failed",
      "Review publication failed. Your review was not verified.",
      400,
    );
  }
  const id = randomUUID();
  try {
    await saveReview({
      id,
      merchantSlug: "longhand",
      productSlug: "verified-membership",
      rating: rating as 1 | 2 | 3 | 4 | 5,
      title,
      body: reviewBody,
      publicIdentity,
      reviewCommitment: value.reviewCommitment as string,
      nullifier: publicInputs[3],
      contractAddress: result.registryAddress,
      chainId: result.chainId,
      txHash: result.hash,
      network: result.network,
      publishedAt: new Date().toISOString(),
      salt: value.salt as string,
      publicInputs,
      blockNumber: result.blockNumber,
      verifiedAt: result.verifiedAt,
    });
  } catch {
    return NextResponse.json({
      id: null,
      nullifier: publicInputs[3],
      txHash: result.hash,
      verifyUrl: `/verify/nullifier/${publicInputs[3]}`,
      storage: "unavailable",
    });
  }
  return NextResponse.json({ id });
}
