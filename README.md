# Verify Trust — Privacy-Preserving Proof of Review

**PROVE THE PURCHASE. PROTECT THE PERSON.**

Verify Trust is a privacy-preserving Proof of Review protocol. A merchant or issuer
signs a purchase credential; a customer proves locally that the credential is valid
for an approved merchant and product; Ethereum verifies the proof and enforces a
deterministic one-time nullifier. The design keeps identity, email, receipt, order
ID, payment information, and purchase history out of the verification record.

> The internet does not need to know who left a verified review. It only needs proof
> that the reviewer had the right to leave it.

## Quickstart

Requirements: Node 20, pnpm, Foundry, Noir/nargo, and Barretenberg. Install and run
the local demo:

```bash
pnpm install
pnpm dev:local
```

Then open `http://127.0.0.1:3000/demo`. The local orchestration starts Anvil,
deploys the contracts, approves the demo issuer, and starts Next.js.

For the deployed Sepolia contracts, copy `apps/web/.env.example`, set
`RPC_URL=https://ethereum-sepolia-rpc.publicnode.com`,
`CHAIN_ID=11155111`, `RELAYER_PRIVATE_KEY`, and
`DEMO_ISSUER_PRIVATE_KEY`, then run:

```bash
pnpm deploy:sepolia
```

Never commit private keys or `.env` files. The committed Sepolia deployment
artifact is `packages/contracts/deployments/11155111.json`.

## Repository structure

```text
apps/web/                 Next.js app and API routes
packages/circuits/        Noir circuit, EVM artifacts, and E2E script
packages/contracts/       Solidity contracts and Foundry tests
packages/sdk/              @verifytrust/sdk
packages/merchant-sdk/     @verifytrust/merchant-sdk
examples/demo-merchant/   NOVA GOODS example issuer
docs/                      Architecture and security documentation
scripts/dev-local.sh       Local Anvil/Next orchestration
scripts/deploy-sepolia.sh  Sepolia contract deployment
```

## Documentation

* [Architecture](docs/ARCHITECTURE.md)
* [Cryptographic specification](docs/CRYPTOGRAPHIC_SPEC.md)
* [Privacy architecture](docs/PRIVACY_ARCHITECTURE.md)
* [Threat model](docs/THREAT_MODEL.md)
* [Demo script](docs/DEMO_SCRIPT.md)
* [Project history](docs/PROJECT_HISTORY.md) — maintained separately
* [Octant application](docs/OCTANT_APPLICATION.md) — maintained separately
* [Octant readiness](docs/OCTANT_READINESS.md) — maintained separately

## Tests and builds

```bash
pnpm -r build
pnpm -r test
pnpm --filter web lint
pnpm --filter web build
pnpm e2e
```

For the contract package:

```bash
cd packages/contracts
forge test -vv
forge build --sizes
```

For the circuit:

```bash
cd packages/circuits
nargo test
pnpm build
```

## Deploying the demo (Vercel, Sepolia)

Import the repository in Vercel with **Root Directory = `apps/web`**. The
`apps/web/vercel.json` build command compiles `@verifytrust/sdk` before
`next build`. Set these environment variables:

| Variable | Value |
| --- | --- |
| `CHAIN_ID` | `11155111` |
| `RPC_URL` | a Sepolia JSON-RPC endpoint, e.g. `https://ethereum-sepolia-rpc.publicnode.com` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://sepolia.etherscan.io` |
| `RELAYER_PRIVATE_KEY` | funded Sepolia testnet key that pays gas for `submitVerifiedReview` (~3.7M gas per demo) |
| `DEMO_ISSUER_PRIVATE_KEY` | the demo issuer key approved in `IssuerRegistry` (see `packages/contracts/deployments/11155111.json`) |
| `STRIPE_SECRET_KEY` | Stripe test-mode secret used by the server-side checkout route |
| `NEXT_PUBLIC_APP_URL` | public origin used for Stripe success and cancellation URLs |
| `KV_REST_API_URL` | optional Upstash Redis REST URL for published reviews |
| `KV_REST_API_TOKEN` | optional Upstash Redis REST token |
| `REVIEW_STORE_FILE` | optional JSON review-store path when Upstash is not configured |

Without `RPC_URL`/`RELAYER_PRIVATE_KEY` the demo runs steps 1–4 locally and
reports an explicit `ETHEREUM NOT CONFIGURED` state instead of faking
verification. Use testnet-only keys; never reuse a mainnet wallet.

The marketplace checkout and review flow use Stripe test mode. When the
Upstash variables are absent, review publication uses the local JSON store.

## License

Apache-2.0. See [LICENSE](LICENSE).

## Status / integrity

This is **testnet-only** software. It has **not received an external security
audit** and includes a **demo merchant only**. The current v1 demo issuer sees the
customer secret; blind issuance, eligibility windows, and other production
hardening are future work. Do not use this implementation for production identity,
payment, or review decisions without independent security and operational review.

Source: [github.com/SilviaMogas/verifytrust](https://github.com/SilviaMogas/verifytrust).
