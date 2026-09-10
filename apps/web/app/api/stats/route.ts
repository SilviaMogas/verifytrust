import { deployments, fieldFromString, getOnChainMetrics } from "@verifytrust/sdk";
import { NextResponse } from "next/server";
import { merchants, products } from "../../../lib/catalog";
import { countDuplicateAttempts, listReviews } from "../../../lib/store";

export const revalidate = 60;

export async function GET() {
  let reviews: Awaited<ReturnType<typeof listReviews>> = [];
  let offchain: {
    publishedReviews: number;
    preventedDuplicates: number;
  } | null = null;
  try {
    reviews = await listReviews();
    offchain = {
      publishedReviews: reviews.length,
      preventedDuplicates: await countDuplicateAttempts(),
    };
  } catch {
    reviews = [];
    offchain = null;
  }
  try {
    const chain = await getOnChainMetrics({
      rpcUrl:
        process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: Number(process.env.CHAIN_ID || 11155111),
      merchantIds: merchants.map((merchant) => fieldFromString(merchant.slug)),
    });
    return NextResponse.json({
      chain,
      offchain,
      products: products.length,
      merchants: merchants.length,
      source: "sepolia-events",
    });
  } catch {
    return NextResponse.json({
      chain: {
        totalVerifications: offchain?.publishedReviews ?? 0,
        registryTotalVerifications: offchain?.publishedReviews ?? 0,
        merchants: new Set(reviews.map((review) => review.merchantSlug)).size,
        lastVerifiedAt: null,
        registryAddress:
          deployments[Number(process.env.CHAIN_ID || 11155111) as keyof typeof deployments]
            ?.verifyTrustRegistry ?? "",
      },
      offchain,
      products: products.length,
      merchants: merchants.length,
      source: "offchain-fallback",
    });
  }
}
