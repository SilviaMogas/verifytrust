import { merchants, products } from "./catalog";
import { countDuplicateAttempts, listReviews as listStoredReviews } from "./store";
import { fieldFromString, getOnChainMetrics } from "@verifytrust/sdk";

export type PublishedReview = {
  id: string;
  merchantSlug: string;
  productSlug: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  publicIdentity: string;
  reviewCommitment: string;
  nullifier: string;
  contractAddress: string;
  chainId: number;
  txHash?: string;
  network?: string;
  publishedAt: string;
  salt?: string;
  publicInputs?: [string, string, string, string, string];
  blockNumber?: number;
  verifiedAt?: number;
};

export async function listReviews(filter?: {
  merchantSlug?: string;
  productSlug?: string;
}): Promise<PublishedReview[]> {
  return listStoredReviews(filter);
}

export async function reviewStats(productSlug: string) {
  const reviews = await listReviews({ productSlug });
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  reviews.forEach((review) => {
    distribution[review.rating] += 1;
  });
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    count: reviews.length,
    average: reviews.length ? total / reviews.length : null,
    distribution,
  };
}

export async function marketplaceMetrics() {
  let reviews: PublishedReview[] = [];
  try {
    reviews = await listReviews();
  } catch {
    reviews = [];
  }
  let preventedDuplicates = 0;
  try {
    preventedDuplicates = await countDuplicateAttempts();
  } catch {
    preventedDuplicates = 0;
  }
  try {
    const chain = await getOnChainMetrics({
      rpcUrl:
        process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: Number(process.env.CHAIN_ID || 11155111),
      merchantIds: merchants.map((merchant) => fieldFromString(merchant.slug)),
    });
    return {
      merchants: merchants.length,
      products: products.length,
      verifiedReviews: chain.totalVerifications,
      preventedDuplicates,
      metricsSource: "sepolia-events",
    };
  } catch {
    return {
      merchants: merchants.length,
      products: products.length,
      verifiedReviews: reviews.length,
      preventedDuplicates,
      metricsSource: "offchain-fallback",
    };
  }
}
