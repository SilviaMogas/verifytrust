import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, defineChain, http, deployments, privateKeyToAccount, sepolia, verifyTrustRegistryAbi } from "@verifytrust/sdk";

const explorerFor = (chainId: number) =>
  chainId === 11155111 ? "https://sepolia.etherscan.io" : undefined;

const errorSelector = (error: unknown): string | undefined => {
  const seen = new Set<object>();
  const visit = (value: unknown, depth: number): string | undefined => {
    if (depth > 5 || value === null || value === undefined) return undefined;
    if (typeof value === "string") {
      const selectors = value.match(/0x[0-9a-fA-F]{8,}/g) ?? [];
      return selectors.find(
        (selector) =>
          selector.slice(0, 10).toLowerCase() === nullifierAlreadyUsedSelector,
      )?.slice(0, 10).toLowerCase();
    }
    if (typeof value !== "object") return undefined;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (
      "errorName" in value &&
      (value as { errorName?: unknown }).errorName === "NullifierAlreadyUsed"
    ) {
      return nullifierAlreadyUsedSelector;
    }
    for (const nested of Object.values(value)) {
      const selector = visit(nested, depth + 1);
      if (selector) return selector;
    }
    return undefined;
  };
  return visit(error, 0);
};

const nullifierAlreadyUsedSelector =
  "0xa483dd04";
const maxBodyBytes = 64 * 1024;
const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;
const proofPattern = /^0x[0-9a-fA-F]+$/;

const invalidPayload = () =>
  NextResponse.json({ error: "INVALID PAYLOAD" }, { status: 400 });

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return invalidPayload();
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
    return invalidPayload();
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return invalidPayload();
  }
  if (
    body === null ||
    typeof body !== "object" ||
    !("proof" in body) ||
    !("publicInputs" in body) ||
    !("reviewCommitment" in body) ||
    typeof body.proof !== "string" ||
    body.proof.length > 32_000 ||
    !proofPattern.test(body.proof) ||
    !Array.isArray(body.publicInputs) ||
    body.publicInputs.length !== 5 ||
    !body.publicInputs.every(
      (value) => typeof value === "string" && bytes32Pattern.test(value),
    ) ||
    typeof body.reviewCommitment !== "string" ||
    !bytes32Pattern.test(body.reviewCommitment) ||
    /^0x0+$/i.test(body.reviewCommitment)
  ) {
    return invalidPayload();
  }
  const payload = body as {
    proof: `0x${string}`;
    publicInputs: [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`];
    reviewCommitment: `0x${string}`;
  };
  const rpc = process.env.RPC_URL;
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!rpc || !key) return NextResponse.json({ configured:false, error:"ETHEREUM NOT CONFIGURED — NOT VERIFIED" }, { status:503 });
  try {
    const chainId = Number(process.env.CHAIN_ID || 31337);
    const deployment = (deployments as Record<number, { verifyTrustRegistry: `0x${string}` }>)[chainId];
    if (!deployment) return NextResponse.json({ configured:false, error:"No deployment configured for this chain" }, { status:503 });
    const chain = chainId === 11155111 ? sepolia : defineChain({ id:chainId, name:"Local Anvil (dev)", nativeCurrency:{name:"Ether",symbol:"ETH",decimals:18}, rpcUrls:{default:{http:[rpc]}} });
    const account = privateKeyToAccount(key as `0x${string}`);
    const publicClient = createPublicClient({ chain, transport:http(rpc) });
    const walletClient = createWalletClient({ account, chain, transport:http(rpc) });
    const hash = await walletClient.writeContract({ account, address:deployment.verifyTrustRegistry, abi:verifyTrustRegistryAbi, functionName:"submitVerifiedReview", args:[payload.proof, payload.publicInputs, payload.reviewCommitment] });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const explorerUrl = explorerFor(chainId);
    if (receipt.status !== "success") {
      return NextResponse.json({
        configured:true,
        error:"TRANSACTION REVERTED — NOT VERIFIED",
        txHash:hash,
        registryAddress:deployment.verifyTrustRegistry,
        chainId,
        network:chain.name,
        explorerUrl,
        relayerAddress:account.address,
      }, { status:400 });
    }
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
