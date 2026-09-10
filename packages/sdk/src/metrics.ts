import {
  createPublicClient,
  defineChain,
  http,
  parseAbi,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { deployments, deploymentBlocks } from "./deployments.js";
import type { Hex32 } from "./types.js";

const reviewVerifiedEvent = parseAbi([
  "event ReviewVerified(bytes32 indexed nullifier, bytes32 indexed merchantId, bytes32 indexed productId, bytes32 reviewCommitment, uint256 verifiedAt)",
])[0];

type ReviewVerifiedLog = {
  args?: {
    merchantId?: Hex32;
    verifiedAt?: bigint;
  };
};

type MetricsClient = {
  getLogs: (args: {
    address: Address;
    event: typeof reviewVerifiedEvent;
    fromBlock: bigint;
  }) => Promise<readonly ReviewVerifiedLog[]>;
};

const chainFor = (chainId: number, rpcUrl: string) =>
  chainId === 11155111
    ? sepolia
    : defineChain({
        id: chainId,
        name: "VerifyTrust network",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      });

export async function getOnChainMetricsFromClient({
  client,
  chainId,
}: {
  client: MetricsClient;
  chainId: number;
}) {
  const deployment = deployments[chainId as keyof typeof deployments];
  if (!deployment) throw new Error(`No deployment configured for chain ${chainId}`);
  const logs = await client.getLogs({
    address: deployment.verifyTrustRegistry as Address,
    event: reviewVerifiedEvent,
    fromBlock: BigInt(
      deploymentBlocks[chainId as keyof typeof deploymentBlocks] ?? 0,
    ),
  });
  const merchants = new Set(
    logs
      .map((log) => log.args?.merchantId)
      .filter((merchantId): merchantId is Hex32 => Boolean(merchantId)),
  );
  const timestamps = logs
    .map((log) => log.args?.verifiedAt)
    .filter((timestamp): timestamp is bigint => timestamp !== undefined);
  return {
    totalVerifications: logs.length,
    merchants: merchants.size,
    lastVerifiedAt: timestamps.length
      ? Number(timestamps.reduce((latest, timestamp) => (timestamp > latest ? timestamp : latest), 0n))
      : null,
    registryAddress: deployment.verifyTrustRegistry,
  };
}

export async function getOnChainMetrics({
  rpcUrl,
  chainId,
}: {
  rpcUrl: string;
  chainId: number;
}) {
  const client = createPublicClient({
    chain: chainFor(chainId, rpcUrl),
    transport: http(rpcUrl),
  });
  return getOnChainMetricsFromClient({
    client: client as unknown as MetricsClient,
    chainId,
  });
}
