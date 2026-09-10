import { getVerificationByNullifier } from "@verifytrust/sdk";
import { NextResponse } from "next/server";
import { deployments as chainDeployments } from "@verifytrust/sdk";

const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;

type VerificationRouteProps = {
  params: Promise<{ nullifier: string }>;
};

export async function GET(
  _request: Request,
  { params }: VerificationRouteProps,
) {
  const { nullifier } = await params;
  if (!bytes32Pattern.test(nullifier)) {
    return NextResponse.json(
      { code: "invalid_nullifier", message: "The nullifier is not valid." },
      { status: 400 },
    );
  }
  const chainId = Number(process.env.CHAIN_ID || 11155111);
  try {
    const verification = await getVerificationByNullifier({
      rpcUrl:
        process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      chainId,
      nullifier: nullifier as `0x${string}`,
    });
    if (!verification) {
      return NextResponse.json(
        { code: "not_found", message: "Verification not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ...verification,
      chainId,
      registryAddress:
        chainDeployments[chainId as keyof typeof chainDeployments]
          ?.verifyTrustRegistry ?? null,
    });
  } catch {
    return NextResponse.json(
      {
        code: "verification_unavailable",
        message: "Chain verification is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
