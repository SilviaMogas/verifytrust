import { deployments } from "@verifytrust/sdk";
import { NextResponse } from "next/server";
import { storeBackend } from "../../../lib/store";

function stripeMode(): "live" | "test" | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : "test";
}

export async function GET() {
  const chainId = Number(process.env.CHAIN_ID || 31337);
  return NextResponse.json({
    store: storeBackend(),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeMode: stripeMode(),
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
