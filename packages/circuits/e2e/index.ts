import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Barretenberg,
  BarretenbergSync,
  UltraHonkBackend,
} from "@aztec/bb.js";
import { Noir as NoirProgram } from "@noir-lang/noir_js";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const FIELD_MODULUS =
  0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;
const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const root = resolve(import.meta.dirname, "..");
const contracts = resolve(root, "../contracts");
const artifact = JSON.parse(
  readFileSync(resolve(root, "target/proof_of_review.json"), "utf8"),
);

const fieldBytes = (value: bigint) =>
  `0x${value.toString(16).padStart(64, "0")}`;
const field = (value: bigint) => value % FIELD_MODULUS;
const fieldFromText = (value: string) =>
  field(BigInt(keccak256(toBytes(value))));
const asBytes = (value: bigint) =>
  Uint8Array.from(Buffer.from(fieldBytes(value).slice(2), "hex"));
const asBigInt = (value: Uint8Array) =>
  BigInt(`0x${Buffer.from(value).toString("hex")}`);

const registryAbi = parseAbi([
  "function submitVerifiedReview(bytes proof, bytes32[] publicInputs, bytes32 reviewCommitment) returns (bytes32)",
  "function isNullifierUsed(bytes32) view returns (bool)",
  "function verificationCount() view returns (uint256)",
  "error NullifierAlreadyUsed(bytes32)",
]);

type Credential = {
  merchantId: bigint;
  productId: bigint;
  timestamp: bigint;
  nonce: bigint;
  customerSecret: bigint;
  issuerKeyHash: bigint;
  nullifier: bigint;
  proof: `0x${string}`;
  publicInputs: `0x${string}`[];
  reviewCommitment: `0x${string}`;
  email: string;
  orderId: string;
  receipt: string;
};

async function makeCredential(
  api: BarretenbergSync,
  noir: NoirProgram,
  backend: UltraHonkBackend,
  issuerPrivateKey: Uint8Array,
  issuerPublicKey: { x: Uint8Array; y: Uint8Array },
  index: number,
): Promise<Credential> {
  const merchantId = fieldFromText("nova-goods");
  const productId = fieldFromText(index === 0 ? "nova-travel-bottle" : "nova-pack");
  const timestamp = BigInt(1_700_000_000 + index);
  const nonce = BigInt(7000 + index);
  const customerSecret = BigInt(9000 + index);
  const commitment = api.poseidon2Hash({
    inputs: [
      asBytes(1n),
      asBytes(merchantId),
      asBytes(productId),
      asBytes(timestamp),
      asBytes(nonce),
      asBytes(customerSecret),
    ],
  }).hash;
  const signature = await api.schnorrConstructSignature({
    messageField: commitment,
    privateKey: issuerPrivateKey,
  });
  const signatureBytes = new Uint8Array([...signature.s, ...signature.e]);
  const issuerKeyHash = asBigInt(
    api.poseidon2Hash({
      inputs: [asBytes(3n), issuerPublicKey.x, issuerPublicKey.y],
    }).hash,
  );
  const nullifier = asBigInt(
    api.poseidon2Hash({
      inputs: [asBytes(2n), asBytes(customerSecret), asBytes(nonce), asBytes(productId)],
    }).hash,
  );
  const input = {
    merchant_id: fieldBytes(merchantId),
    product_id: fieldBytes(productId),
    purchase_timestamp: fieldBytes(timestamp),
    purchase_nonce: fieldBytes(nonce),
    customer_secret: fieldBytes(customerSecret),
    issuer_pk_x: fieldBytes(asBigInt(issuerPublicKey.x)),
    issuer_pk_y: fieldBytes(asBigInt(issuerPublicKey.y)),
    signature: Array.from(signatureBytes),
    pub_merchant_id: fieldBytes(merchantId),
    pub_product_id: fieldBytes(productId),
    pub_issuer_key_hash: fieldBytes(issuerKeyHash),
    pub_nullifier: fieldBytes(nullifier),
    pub_protocol_version: fieldBytes(1n),
  };
  const { witness } = await noir.execute(input);
  const started = Date.now();
  const proofData = await backend.generateProof(witness, {
    verifierTarget: "evm",
  });
  const provingMs = Date.now() - started;
  console.log(`credential ${index + 1} proving time: ${provingMs} ms`);
  if (!(await backend.verifyProof(proofData, { verifierTarget: "evm" }))) {
    throw new Error("bb.js proof verification failed");
  }
  const expectedInputs = [
    fieldBytes(merchantId),
    fieldBytes(productId),
    fieldBytes(issuerKeyHash),
    fieldBytes(nullifier),
    fieldBytes(1n),
  ];
  if (proofData.publicInputs.join().toLowerCase() !== expectedInputs.join().toLowerCase()) {
    throw new Error("Poseidon2 JS/Noir public-input parity check failed");
  }
  console.log(`credential ${index + 1} Poseidon2 JS/Noir parity: confirmed`);
  return {
    merchantId,
    productId,
    timestamp,
    nonce,
    customerSecret,
    issuerKeyHash,
    nullifier,
    proof: `0x${Buffer.from(proofData.proof).toString("hex")}`,
    publicInputs: proofData.publicInputs as `0x${string}`[],
    reviewCommitment: fieldBytes(field(10_000n + BigInt(index))),
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
  const api = await BarretenbergSync.initSingleton();
  const issuerPrivateKey = asBytes(66n);
  const issuer = api.schnorrComputePublicKey({ privateKey: issuerPrivateKey });
  const noir = new NoirProgram(artifact);
  const backend = new UltraHonkBackend(
    artifact.bytecode,
    await Barretenberg.initSingleton(),
  );
  const credentials = [
    await makeCredential(api, noir, backend, issuerPrivateKey, issuer.publicKey, 0),
    await makeCredential(api, noir, backend, issuerPrivateKey, issuer.publicKey, 1),
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
          DEMO_MERCHANT_ID: fieldBytes(credentials[0].merchantId),
          DEMO_ISSUER_KEY_HASH: fieldBytes(credentials[0].issuerKeyHash),
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
      address: deployment.verifyTrustRegistry,
      abi: registryAbi,
      functionName: "submitVerifiedReview",
      args: [
        credentials[0].proof,
        credentials[0].publicInputs,
        credentials[0].reviewCommitment,
      ],
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
      address: deployment.verifyTrustRegistry,
      abi: registryAbi,
      functionName: "submitVerifiedReview",
      args: [
        credentials[1].proof,
        credentials[1].publicInputs,
        credentials[1].reviewCommitment,
      ],
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
    await Barretenberg.destroySingleton();
    BarretenbergSync.destroySingleton();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
