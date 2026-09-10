import { deployments, fieldFromString, getOnChainMetrics } from "@verifytrust/sdk";
import { NextResponse } from "next/server";
import { merchants, products } from "../../../lib/catalog";
import { countDuplicateAttempts, listReviews } from "../../../lib/store";

export const revalidate = 60;

export async function GET() {
  const reviews = await listReviews().catch(() => null);
  const preventedDuplicates = await countDuplicateAttempts().catch(() => null);
  const offchain =
    reviews && preventedDuplicates !== null
      ? { publishedReviews: reviews.length, preventedDuplicates }
      : null;
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
        totalVerifications: reviews?.length ?? 0,
        registryTotalVerifications: reviews?.length ?? 0,
        merchants: new Set((reviews ?? []).map((review) => review.merchantSlug)).size,
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
