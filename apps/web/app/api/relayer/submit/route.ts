import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, defineChain, http, deployments, privateKeyToAccount, verifyTrustRegistryAbi } from "@verifytrust/sdk";

export async function POST(request: Request) {
  const rpc = process.env.RPC_URL;
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!rpc || !key) return NextResponse.json({ configured:false, error:"ETHEREUM NOT CONFIGURED — NOT VERIFIED" }, { status:503 });
  try {
    const body = await request.json();
    const chainId = Number(process.env.CHAIN_ID || 31337);
    const deployment = (deployments as Record<number, { verifyTrustRegistry: `0x${string}` }>)[chainId];
    if (!deployment) return NextResponse.json({ configured:false, error:"No deployment configured for this chain" }, { status:503 });
    const chain = defineChain({ id:chainId, name:"Verify Trust local", nativeCurrency:{name:"Ether",symbol:"ETH",decimals:18}, rpcUrls:{default:{http:[rpc]}} });
    const account = privateKeyToAccount(key as `0x${string}`);
    const publicClient = createPublicClient({ chain, transport:http(rpc) });
    const walletClient = createWalletClient({ account, chain, transport:http(rpc) });
    const hash = await walletClient.writeContract({ account, address:deployment.verifyTrustRegistry, abi:verifyTrustRegistryAbi, functionName:"submitVerifiedReview", args:[body.proof, body.publicInputs, body.reviewCommitment] });
    await publicClient.waitForTransactionReceipt({ hash });
    return NextResponse.json({ configured:true, hash, registryAddress:deployment.verifyTrustRegistry, chainId });
  } catch (error) {
    return NextResponse.json({ configured:true, error:error instanceof Error ? error.message : "transaction failed" }, { status:400 });
  }
}
