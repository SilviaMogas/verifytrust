import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import {
  computeIssuerKeyHash,
  computeNullifier,
  fieldFromString,
  generateProof,
  issueCredential,
  verifyProof,
  verifyTrustRegistryAbi as registryAbi,
  type Credential as SdkCredential,
} from "@verifytrust/sdk";

const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const root = resolve(import.meta.dirname, "..");
const contracts = resolve(root, "../contracts");
const fieldBytes = (value: bigint) =>
  `0x${value.toString(16).padStart(64, "0")}` as `0x${string}`;

type Credential = {
  credential: SdkCredential;
  proof: `0x${string}`;
  publicInputs: `0x${string}`[];
  reviewCommitment: `0x${string}`;
  email: string;
  orderId: string;
  receipt: string;
};

async function makeCredential(
  issuerPrivateKey: `0x${string}`,
  index: number,
): Promise<Credential> {
  const credential = await issueCredential({
    merchantId: fieldFromString("nova-goods"),
    productId: fieldFromString(index === 0 ? "nova-travel-bottle" : "nova-pack"),
    purchaseTimestamp: BigInt(1_700_000_000 + index),
    issuerPrivateKey,
    customerSecret: fieldBytes(BigInt(9000 + index)),
  });
  const started = Date.now();
  const proofData = await generateProof(credential);
  const provingMs = Date.now() - started;
  console.log(`credential ${index + 1} proving time: ${provingMs} ms`);
  if (!(await verifyProof(proofData))) {
    throw new Error("bb.js proof verification failed");
  }
  const expectedInputs = [
    credential.merchantId,
    credential.productId,
    await computeIssuerKeyHash(credential.issuerPublicKey),
    await computeNullifier(credential),
    fieldBytes(1n),
  ];
  if (proofData.publicInputs.join().toLowerCase() !== expectedInputs.join().toLowerCase()) {
    throw new Error("Poseidon2 JS/Noir public-input parity check failed");
  }
  console.log(`credential ${index + 1} Poseidon2 JS/Noir parity: confirmed`);
  return {
    credential,
    proof: proofData.proof,
    publicInputs: proofData.publicInputs as `0x${string}`[],
    reviewCommitment: fieldBytes(10_000n + BigInt(index)),
    email: `reviewer-${index + 1}@example.test`,
    orderId: `order-${index + 1}`,
    receipt: `receipt-${index + 1}`,
  };
}

async function waitForAnvil(url: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
      });
      if (response.ok) return;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
    }
  }
  throw new Error("Anvil did not start");
}

async function main() {
  const issuerPrivateKey = fieldBytes(66n);
  const credentials = [
    await makeCredential(issuerPrivateKey, 0),
    await makeCredential(issuerPrivateKey, 1),
  ];

  const anvil = spawn("anvil", ["--silent"], { stdio: "ignore" });
  try {
    const rpcUrl = "http://127.0.0.1:8545";
    await waitForAnvil(rpcUrl);
    execFileSync(
      "forge",
      [
        "script",
        "script/Deploy.s.sol:Deploy",
        "--broadcast",
        "--rpc-url",
        rpcUrl,
        "--private-key",
        ANVIL_PRIVATE_KEY,
      ],
      {
        cwd: contracts,
        env: {
          ...process.env,
          DEMO_MERCHANT_ID: credentials[0].credential.merchantId,
          DEMO_ISSUER_KEY_HASH: await computeIssuerKeyHash(
            credentials[0].credential.issuerPublicKey,
          ),
        },
        stdio: "inherit",
      },
    );
    const deployment = JSON.parse(
      readFileSync(resolve(contracts, "deployments/31337.json"), "utf8"),
    );
    const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: foundry,
      transport: http(rpcUrl),
    });
    const submissionHash = await walletClient.writeContract({
      account,
      address: deployment.verifyTrustRegistry,
      abi: registryAbi,
      functionName: "submitVerifiedReview",
      args: [
        credentials[0].proof,
        credentials[0].publicInputs,
        credentials[0].reviewCommitment,
      ],
      chain: foundry,
    });
    await publicClient.waitForTransactionReceipt({ hash: submissionHash });
    if (
      !(await publicClient.readContract({
        address: deployment.verifyTrustRegistry,
        abi: registryAbi,
        functionName: "isNullifierUsed",
        args: [credentials[0].publicInputs[3]],
      }))
    ) {
      throw new Error("first review submission was not recorded");
    }
    try {
      await publicClient.simulateContract({
        account,
        address: deployment.verifyTrustRegistry,
        abi: registryAbi,
        functionName: "submitVerifiedReview",
        args: [
          credentials[0].proof,
          credentials[0].publicInputs,
          credentials[0].reviewCommitment,
        ],
      });
      throw new Error("replayed proof unexpectedly simulated successfully");
    } catch (error) {
      if (!String(error).includes("NullifierAlreadyUsed")) {
        throw error;
      }
      console.log("replay rejected with NullifierAlreadyUsed");
    }
    const secondSubmissionHash = await walletClient.writeContract({
      account,
      address: deployment.verifyTrustRegistry,
      abi: registryAbi,
      functionName: "submitVerifiedReview",
      args: [
        credentials[1].proof,
        credentials[1].publicInputs,
        credentials[1].reviewCommitment,
      ],
      chain: foundry,
    });
    await publicClient.waitForTransactionReceipt({ hash: secondSubmissionHash });
    if (
      (await publicClient.readContract({
        address: deployment.verifyTrustRegistry,
        abi: registryAbi,
        functionName: "verificationCount",
      })) !== 2n
    ) {
      throw new Error("second independent review submission was not recorded");
    }
    console.log("second independent purchase accepted");
    mkdirSync(resolve(contracts, "test/fixtures"), { recursive: true });
    credentials.forEach((credential, index) => {
      writeFileSync(
        resolve(contracts, `test/fixtures/credential-${index + 1}.json`),
        JSON.stringify(
          {
            proof: credential.proof,
            publicInputs: credential.publicInputs,
            reviewCommitment: credential.reviewCommitment,
            email: credential.email,
            orderId: credential.orderId,
            receipt: credential.receipt,
          },
          null,
          2,
        ) + "\n",
      );
    });
  } finally {
    anvil.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
