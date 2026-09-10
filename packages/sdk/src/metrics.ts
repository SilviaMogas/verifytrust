import {
  createPublicClient,
  defineChain,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { deployments, deploymentBlocks } from "./deployments.js";
import type { Hex32 } from "./types.js";

const reviewVerifiedEvent = parseAbi([
  "event ReviewVerified(bytes32 indexed nullifier, bytes32 indexed merchantId, bytes32 indexed productId, bytes32 reviewCommitment, uint256 verifiedAt)",
])[0];
const verificationCountAbi = parseAbi([
  "function verificationCount() view returns (uint256)",
]);

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
    args?: { merchantId?: readonly Hex32[] };
  }) => Promise<readonly ReviewVerifiedLog[]>;
  readContract: (args: {
    address: Address;
    abi: typeof verificationCountAbi;
    functionName: "verificationCount";
  }) => Promise<bigint>;
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
  merchantIds,
}: {
  client: MetricsClient;
  chainId: number;
  merchantIds?: Hex[];
}) {
  const deployment = deployments[chainId as keyof typeof deployments];
  if (!deployment) throw new Error(`No deployment configured for chain ${chainId}`);
  const filter = merchantIds?.length
    ? { merchantId: merchantIds as Hex32[] }
    : undefined;
  const logs = await client.getLogs({
    address: deployment.verifyTrustRegistry as Address,
    event: reviewVerifiedEvent,
    fromBlock: BigInt(
      deploymentBlocks[chainId as keyof typeof deploymentBlocks] ?? 0,
    ),
    ...(filter ? { args: filter } : {}),
  });
  const registryTotalVerifications = Number(
    await client.readContract({
      address: deployment.verifyTrustRegistry as Address,
      abi: verificationCountAbi,
      functionName: "verificationCount",
    }),
  );
  const merchants = new Set(
    logs
      .map((log) => log.args?.merchantId)
      .filter((merchantId): merchantId is Hex32 => Boolean(merchantId)),
  );
  const timestamps = logs
    .map((log) => log.args?.verifiedAt)
    .filter((timestamp): timestamp is bigint => timestamp !== undefined);
  return {
    totalVerifications: merchantIds?.length
      ? logs.length
      : registryTotalVerifications,
    registryTotalVerifications,
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
  merchantIds,
}: {
  rpcUrl: string;
  chainId: number;
  merchantIds?: Hex[];
}) {
  const client = createPublicClient({
    chain: chainFor(chainId, rpcUrl),
    transport: http(rpcUrl),
  });
  return getOnChainMetricsFromClient({
    client: client as unknown as MetricsClient,
    chainId,
    merchantIds,
  });
}
