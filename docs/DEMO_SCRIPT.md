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

TBD: addresses to be filled.

The repository currently contains a local `31337` deployment artifact. Sepolia
deployment addresses and a production relayer configuration are **NOT IMPLEMENTED**.
