import { merchants, products } from "./catalog";
import { countDuplicateAttempts, listReviews as listStoredReviews } from "./store";

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
  const reviews = await listReviews();
  return {
    merchants: merchants.length,
    products: products.length,
    verifiedReviews: reviews.length,
    preventedDuplicates: await countDuplicateAttempts(),
  };
}
