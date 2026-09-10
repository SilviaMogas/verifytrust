import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
} from "viem";
import { randomHex32 } from "./crypto.js";
import type { ReviewCommitment, Hex32 } from "./types.js";

export const createReviewCommitment = ({
  reviewText,
  rating,
  salt,
}: {
  reviewText: string;
  rating: number;
  salt?: Hex32;
}): ReviewCommitment => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("rating must be an integer from 1 to 5");
  }
  const actualSalt = salt ?? randomHex32();
  const textHash = keccak256(toBytes(reviewText));
  const encoded = encodeAbiParameters(
    parseAbiParameters("string, bytes32, uint8, bytes32"),
    ["verifytrust.review.v1", textHash, rating, actualSalt],
  );
  return { commitment: keccak256(encoded) as Hex32, salt: actualSalt };
};
