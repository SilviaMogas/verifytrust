import { NextResponse } from "next/server";
import { issueCredential } from "@verifytrust/sdk";

const DEV_ISSUER_KEY = `0x${"42".padStart(64, "0")}` as `0x${string}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.merchantId !== "string" || typeof body.productId !== "string" || typeof body.customerSecret !== "string") return NextResponse.json({ error: "merchantId, productId, and customerSecret are required" }, { status: 400 });
    const chainId = Number(process.env.CHAIN_ID || 31337);
    const issuerKey = process.env.DEMO_ISSUER_PRIVATE_KEY
      ?? (chainId === 31337 ? DEV_ISSUER_KEY : undefined);
    if (!issuerKey) return NextResponse.json({ error: "ISSUER NOT CONFIGURED" }, { status: 503 });
    const credential = await issueCredential({ merchantId: body.merchantId, productId: body.productId, purchaseTimestamp: BigInt(body.purchaseTimestamp ?? Math.floor(Date.now()/1000)), customerSecret: body.customerSecret, issuerPrivateKey: issuerKey as `0x${string}` });
    return NextResponse.json({ credential: { ...credential, purchaseTimestamp: credential.purchaseTimestamp.toString() }, devKey: !process.env.DEMO_ISSUER_PRIVATE_KEY }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "issuance failed" }, { status: 400 });
  }
}
