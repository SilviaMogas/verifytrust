import { deployments } from "@verifytrust/sdk";
import { NextResponse } from "next/server";
import { storeBackend } from "../../../lib/store";

export async function GET() {
  const chainId = Number(process.env.CHAIN_ID || 31337);
  return NextResponse.json({
    store: storeBackend(),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    chain: {
      configured: Boolean(
        process.env.RPC_URL &&
          deployments[chainId as keyof typeof deployments],
      ),
      chainId,
    },
    issuer: Boolean(
      process.env.DEMO_ISSUER_PRIVATE_KEY || chainId === 31337,
    ),
    relayer: Boolean(process.env.RELAYER_PRIVATE_KEY),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  });
}
