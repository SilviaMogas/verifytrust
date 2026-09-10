# Demo Script

## 90-second reviewer script

Open `/demo`. The flow is designed to complete in under 90 seconds on the local
Anvil setup.

1. **GENERATE DEMO PURCHASE CREDENTIAL** — Say: “NOVA GOODS issues a demo
   credential for a NOVA Travel Bottle. The browser generates the customer secret
   and demo private purchase data, then requests an issuer signature.”
2. **SHOW PRIVATE DATA** — Click **CONTINUE** (optionally click **REVEAL VALUES**).
   Point out the `PRIVATE` labels and the banner: “Values never leave this browser /
   never written onchain.” Mention that the demo issuer sees the secret in v1;
   blind issuance is future work.
3. **GENERATE ZERO-KNOWLEDGE PROOF** — Click **GENERATE PRIVATE PROOF**. Wait for
   **VERIFIED LOCALLY** and point out the five public inputs and proof size.
   Explain that the WASM prover used the private credential locally.
4. **WRITE REVIEW** — Click **WRITE REVIEW**, leave the sample text and rating, then
   click **COMPUTE REVIEW COMMITMENT**. Point out: “Review text stays offchain.”
5. **VERIFY ON ETHEREUM** — Click **VERIFY ON ETHEREUM**. The relayer sends the
   actual transaction; the UI must show a real hash. If RPC configuration is
   missing, the expected honest state is **ETHEREUM NOT CONFIGURED — NOT VERIFIED**,
   not a fabricated hash.
6. **DISPLAY** — Read the badges **VERIFIED PURCHASE**, **PRIVACY PROTECTED**, and
   **ETHEREUM VERIFIED**. Point out `NULLIFIER STATUS · USED` and
   **VERIFICATION TRANSACTION**.
7. **ATTEMPT DUPLICATE REVIEW** — Click **ATTEMPT DUPLICATE REVIEW**, then
   **RESUBMIT SAME PROOF**. The client check and real contract attempt should result
   in **REVIEW ALREADY USED / NULLIFIER REJECTED**.

Use **RESET DEMO** to return to step one. The display is a local demonstration; it
does not publish review text or the private credential to the registry.

## Local setup

```bash
pnpm install
pnpm dev:local
```

This starts Anvil on `http://127.0.0.1:8545`, deploys the local contracts with the
demo issuer approved, and starts Next.js on `http://127.0.0.1:3000`. Open
`http://127.0.0.1:3000/demo`.

## Sepolia

Network: **Ethereum Sepolia** (`11155111`)

Deployment:

| Contract | Address |
| --- | --- |
| HonkVerifier | [`0xE94B6012d80687a62CD140D0bf65E40628D59640`](https://sepolia.etherscan.io/address/0xE94B6012d80687a62CD140D0bf65E40628D59640) |
| ProofOfReviewVerifier | [`0x6936fD59d9fa3e8b1fe3Fe1E74f3fCa9a307e61E`](https://sepolia.etherscan.io/address/0x6936fD59d9fa3e8b1fe3Fe1E74f3fCa9a307e61E) |
| IssuerRegistry | [`0x285696706abe3f7Caa4b31Fa94e18613d06b218c`](https://sepolia.etherscan.io/address/0x285696706abe3f7Caa4b31Fa94e18613d06b218c) |
| VerifyTrustRegistry | [`0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45`](https://sepolia.etherscan.io/address/0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45) |

Real end-to-end verification:

- Successful submission: [`0xbe444629566128c7c8374eafde21f7004dc64832b225afeb6e615c9e9aaf3edb`](https://sepolia.etherscan.io/tx/0xbe444629566128c7c8374eafde21f7004dc64832b225afeb6e615c9e9aaf3edb)
- Replay transaction: [`0xd6a5a48f442ba445d866181cd1f9e2bc90cac03b5286eefd95a55ec41883db20`](https://sepolia.etherscan.io/tx/0xd6a5a48f442ba445d866181cd1f9e2bc90cac03b5286eefd95a55ec41883db20) (mined with status `0`; the same calldata reverts with `NullifierAlreadyUsed`).

The deployment is testnet-only and uses a relayer key supplied through
environment configuration. Production hosting and relayer operations remain
future work.
