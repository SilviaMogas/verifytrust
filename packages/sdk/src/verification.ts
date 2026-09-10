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
import { verifyTrustRegistryAbi } from "./chain.js";
import type { Hex32 } from "./types.js";

const reviewVerifiedEvent = parseAbi([
  "event ReviewVerified(bytes32 indexed nullifier, bytes32 indexed merchantId, bytes32 indexed productId, bytes32 reviewCommitment, uint256 verifiedAt)",
])[0];

type VerificationLog = {
  args?: {
    reviewCommitment?: Hex32;
    merchantId?: Hex32;
    productId?: Hex32;
    verifiedAt?: bigint;
  };
  transactionHash?: Hex;
  blockNumber?: bigint;
};

type VerificationClient = {
  readContract: (args: {
    address: Address;
    abi: typeof verifyTrustRegistryAbi;
    functionName: "getVerification" | "isNullifierUsed";
    args: [Hex32];
  }) => Promise<readonly [Hex32, Hex32, Hex32, Hex32, bigint] | boolean>;
  getLogs: (args: {
    address: Address;
    event: typeof reviewVerifiedEvent;
    fromBlock: bigint;
    args: { nullifier: Hex32 };
  }) => Promise<readonly VerificationLog[]>;
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

export type ChainVerification = {
  used: true;
  reviewCommitment: Hex32;
  merchantId: Hex32;
  productId: Hex32;
  verifiedAt: number;
  txHash: Hex;
  blockNumber: number;
};

export async function getVerificationByNullifierFromClient({
  client,
  chainId,
  nullifier,
}: {
  client: VerificationClient;
  chainId: number;
  nullifier: Hex32;
}): Promise<ChainVerification | null> {
  const deployment = deployments[chainId as keyof typeof deployments];
  if (!deployment) throw new Error(`No deployment configured for chain ${chainId}`);
  const used = (await client.readContract({
    address: deployment.verifyTrustRegistry as Address,
    abi: verifyTrustRegistryAbi,
    functionName: "isNullifierUsed",
    args: [nullifier],
  })) as boolean;
  if (!used) return null;

  const verification = (await client.readContract({
    address: deployment.verifyTrustRegistry as Address,
    abi: verifyTrustRegistryAbi,
    functionName: "getVerification",
    args: [nullifier],
  })) as readonly [Hex32, Hex32, Hex32, Hex32, bigint];
  const logs = await client.getLogs({
    address: deployment.verifyTrustRegistry as Address,
    event: reviewVerifiedEvent,
    fromBlock: BigInt(
      deploymentBlocks[chainId as keyof typeof deploymentBlocks] ?? 0,
    ),
    args: { nullifier },
  });
  const log = logs.at(-1);
  if (!log?.transactionHash || log.blockNumber === undefined) {
    throw new Error("ReviewVerified event not found");
  }
  return {
    used: true,
    reviewCommitment: verification[0],
    productId: verification[1],
    merchantId: verification[2],
    verifiedAt: Number(verification[4]),
    txHash: log.transactionHash,
    blockNumber: Number(log.blockNumber),
  };
}

export async function getVerificationByNullifier({
  rpcUrl,
  chainId,
  nullifier,
}: {
  rpcUrl: string;
  chainId: number;
  nullifier: Hex32;
}): Promise<ChainVerification | null> {
  const client = createPublicClient({
    chain: chainFor(chainId, rpcUrl),
    transport: http(rpcUrl),
  });
  return getVerificationByNullifierFromClient({
    client: client as unknown as VerificationClient,
    chainId,
    nullifier,
  });
}
