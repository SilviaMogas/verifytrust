import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, defineChain, http, deployments, privateKeyToAccount, sepolia, verifyTrustRegistryAbi } from "@verifytrust/sdk";

const explorerFor = (chainId: number) =>
  chainId === 11155111 ? "https://sepolia.etherscan.io" : undefined;

const errorSelector = (error: unknown): string | undefined => {
  const text = JSON.stringify(error) + "\n" + (error instanceof Error ? error.message : String(error));
  const selectors = text.match(/0x[0-9a-fA-F]{8,}/g) ?? [];
  return selectors.find((value) => value.slice(0, 10).toLowerCase() === nullifierAlreadyUsedSelector)?.slice(0, 10).toLowerCase()
    ?? selectors[0]?.slice(0, 10).toLowerCase();
};

const nullifierAlreadyUsedSelector =
  "0xa483dd04";

export async function POST(request: Request) {
  const rpc = process.env.RPC_URL;
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!rpc || !key) return NextResponse.json({ configured:false, error:"ETHEREUM NOT CONFIGURED — NOT VERIFIED" }, { status:503 });
  try {
    const body = await request.json();
    const chainId = Number(process.env.CHAIN_ID || 31337);
    const deployment = (deployments as Record<number, { verifyTrustRegistry: `0x${string}` }>)[chainId];
    if (!deployment) return NextResponse.json({ configured:false, error:"No deployment configured for this chain" }, { status:503 });
    const chain = chainId === 11155111 ? sepolia : defineChain({ id:chainId, name:"Local Anvil (dev)", nativeCurrency:{name:"Ether",symbol:"ETH",decimals:18}, rpcUrls:{default:{http:[rpc]}} });
    const account = privateKeyToAccount(key as `0x${string}`);
    const publicClient = createPublicClient({ chain, transport:http(rpc) });
    const walletClient = createWalletClient({ account, chain, transport:http(rpc) });
    const hash = await walletClient.writeContract({ account, address:deployment.verifyTrustRegistry, abi:verifyTrustRegistryAbi, functionName:"submitVerifiedReview", args:[body.proof, body.publicInputs, body.reviewCommitment] });
    await publicClient.waitForTransactionReceipt({ hash });
    const explorerUrl = explorerFor(chainId);
    return NextResponse.json({ configured:true, hash, registryAddress:deployment.verifyTrustRegistry, chainId, network:chain.name, explorerUrl, relayerAddress:account.address });
  } catch (error) {
    const selector = errorSelector(error);
    return NextResponse.json({
      configured:true,
      error:error instanceof Error ? error.message : "transaction failed",
      errorSelector: selector,
      errorName: selector === nullifierAlreadyUsedSelector ? "NullifierAlreadyUsed" : undefined,
    }, { status:400 });
  }
}
