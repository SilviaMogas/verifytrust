import { NextResponse } from "next/server";
import { deployments, privateKeyToAccount } from "@verifytrust/sdk";

export async function GET() {
  const rpc = process.env.RPC_URL;
  const chainId = Number(process.env.CHAIN_ID || 31337);
  const deployment = (deployments as Record<number, {
    verifyTrustRegistry: `0x${string}`;
    proofVerifier: `0x${string}`;
    issuerRegistry: `0x${string}`;
  }>)[chainId];
  const network = chainId === 11155111 ? "Ethereum Sepolia" : "Local Anvil (dev)";
  const explorerUrl = chainId === 11155111 ? "https://sepolia.etherscan.io" : undefined;
  const relayerAddress = process.env.RELAYER_PRIVATE_KEY
    ? privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`).address
    : undefined;
  if (!rpc) return NextResponse.json({ configured: false, chainId, network, registryAddress: deployment?.verifyTrustRegistry, verifierAddress: deployment?.proofVerifier, issuerRegistryAddress: deployment?.issuerRegistry, relayerAddress, deployed: Boolean(deployment), explorerUrl });
  try {
    const response = await fetch(rpc, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]}), cache:"no-store" });
    if (!response.ok) throw new Error("RPC unavailable");
    const result = await response.json();
    const actualChainId = Number.parseInt(result.result, 16);
    return NextResponse.json({ configured: true, chainId: actualChainId, network: actualChainId === 11155111 ? "Ethereum Sepolia" : "Local Anvil (dev)", registryAddress: deployment?.verifyTrustRegistry, verifierAddress: deployment?.proofVerifier, issuerRegistryAddress: deployment?.issuerRegistry, relayerAddress, deployed: Boolean(deployment), explorerUrl: actualChainId === 11155111 ? "https://sepolia.etherscan.io" : undefined });
  } catch { return NextResponse.json({ configured: false, chainId, network, registryAddress: deployment?.verifyTrustRegistry, verifierAddress: deployment?.proofVerifier, issuerRegistryAddress: deployment?.issuerRegistry, relayerAddress, deployed: Boolean(deployment), explorerUrl }); }
}
