import {
  createPublicClient,
  createWalletClient,
  defineChain,
  deployments,
  http,
  privateKeyToAccount,
  sepolia,
  verifyTrustRegistryAbi,
  type Hex32,
} from "@verifytrust/sdk";
import { decodeEventLog, parseAbi } from "viem";

const nullifierAlreadyUsedSelector = "0xa483dd04";
const reviewVerifiedEvent = parseAbi([
  "event ReviewVerified(bytes32 indexed nullifier, bytes32 indexed merchantId, bytes32 indexed productId, bytes32 reviewCommitment, uint256 verifiedAt)",
])[0];

const explorerFor = (chainId: number) =>
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  (chainId === 11155111 ? "https://sepolia.etherscan.io" : undefined);

function errorSelector(error: unknown): string | undefined {
  const seen = new Set<object>();
  const visit = (value: unknown, depth: number): string | undefined => {
    if (depth > 5 || value === null || value === undefined) return undefined;
    if (typeof value === "string") {
      if (value.includes("NullifierAlreadyUsed")) {
        return nullifierAlreadyUsedSelector;
      }
      const signature = value.match(
        /signature(?:["']?\s*:\s*|\s+)(0x[0-9a-fA-F]{8})\b/i,
      );
      if (signature) return signature[1].toLowerCase();
      if (/^0x[0-9a-fA-F]{8}$/.test(value)) return value.toLowerCase();
      if (/^0x[0-9a-fA-F]{74}$/.test(value)) return value.slice(0, 10).toLowerCase();
      return undefined;
    }
    if (typeof value !== "object" || seen.has(value)) return undefined;
    seen.add(value);
    for (const key of ["signature", "shortMessage", "message", "data"]) {
      const selector = visit((value as Record<string, unknown>)[key], depth + 1);
      if (selector) return selector;
    }
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
}

export type RelayerInput = {
  proof: `0x${string}`;
  publicInputs: [Hex32, Hex32, Hex32, Hex32, Hex32];
  reviewCommitment: Hex32;
};

export type RelayerResult =
  | {
      kind: "success";
      hash: `0x${string}`;
      registryAddress: `0x${string}`;
      chainId: number;
      network: string;
      explorerUrl?: string;
      relayerAddress: `0x${string}`;
      blockNumber: number;
      verifiedAt?: number;
    }
  | {
      kind: "reverted";
      txHash?: `0x${string}`;
      registryAddress: `0x${string}`;
      chainId: number;
      network: string;
      explorerUrl?: string;
      relayerAddress: `0x${string}`;
      errorSelector?: string;
    }
  | { kind: "duplicate"; errorSelector: string }
  | { kind: "not_configured"; message: string }
  | { kind: "rpc_error"; message: string };

export async function submitToRelayer({
  proof,
  publicInputs,
  reviewCommitment,
}: RelayerInput): Promise<RelayerResult> {
  const rpc = process.env.RPC_URL;
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!rpc || !key) {
    return {
      kind: "not_configured",
      message: "ETHEREUM NOT CONFIGURED — NOT VERIFIED",
    };
  }
  const chainId = Number(process.env.CHAIN_ID || 31337);
  const deployment = (
    deployments as Record<
      number,
      { verifyTrustRegistry: `0x${string}` }
    >
  )[chainId];
  if (!deployment) {
    return { kind: "not_configured", message: "No deployment configured for this chain" };
  }
  const chain =
    chainId === 11155111
      ? sepolia
      : defineChain({
          id: chainId,
          name: "Local Anvil (dev)",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: [rpc] } },
        });
  try {
    const account = privateKeyToAccount(key as `0x${string}`);
    const publicClient = createPublicClient({ chain, transport: http(rpc) });
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpc),
    });
    await publicClient.simulateContract({
      account,
      address: deployment.verifyTrustRegistry,
      abi: verifyTrustRegistryAbi,
      functionName: "submitVerifiedReview",
      args: [proof, publicInputs, reviewCommitment],
    });
    const hash = await walletClient.writeContract({
      account,
      address: deployment.verifyTrustRegistry,
      abi: verifyTrustRegistryAbi,
      functionName: "submitVerifiedReview",
      args: [proof, publicInputs, reviewCommitment],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const details = {
      registryAddress: deployment.verifyTrustRegistry,
      chainId,
      network: chain.name,
      explorerUrl: explorerFor(chainId),
      relayerAddress: account.address,
      blockNumber: Number(receipt.blockNumber),
    };
    if (receipt.status !== "success") {
      return { kind: "reverted", txHash: hash, ...details };
    }
    let verifiedAt: number | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== deployment.verifyTrustRegistry.toLowerCase()) {
        continue;
      }
      try {
        const decoded = decodeEventLog({
          abi: [reviewVerifiedEvent],
          data: log.data,
          topics: log.topics,
        });
        if (
          decoded.eventName === "ReviewVerified" &&
          decoded.args.nullifier.toLowerCase() === publicInputs[3].toLowerCase()
        ) {
          verifiedAt = Number(decoded.args.verifiedAt);
          break;
        }
      } catch {
        continue;
      }
    }
    if (verifiedAt === undefined) {
      try {
        const block = await publicClient.getBlock({
          blockNumber: receipt.blockNumber,
        });
        verifiedAt = Number(block.timestamp);
      } catch {
        verifiedAt = undefined;
      }
    }
    return { kind: "success", hash, ...details, verifiedAt };
  } catch (error) {
    const selector = errorSelector(error);
    if (selector === nullifierAlreadyUsedSelector) {
      return { kind: "duplicate", errorSelector: selector };
    }
    if (selector) {
      const account = privateKeyToAccount(key as `0x${string}`);
      return {
        kind: "reverted",
        registryAddress: deployment.verifyTrustRegistry,
        chainId,
        network: chain.name,
        explorerUrl: explorerFor(chainId),
        relayerAddress: account.address,
        errorSelector: selector,
      };
    }
    return {
      kind: "rpc_error",
      message: error instanceof Error ? error.message : "transaction failed",
    };
  }
}

export { errorSelector, nullifierAlreadyUsedSelector };
