# Architecture

## System overview

Verify Trust is a testnet-oriented Proof of Review implementation. An issuer signs a
credential describing a merchant, product, purchase timestamp, nonce, and customer
secret. The customer-side prover uses that credential to produce an EVM-targeted
UltraHonk proof. The proof exposes five protocol public inputs; the credential fields,
signature, and customer secret are witness data.

The registry accepts a proof from any caller after checking protocol version, issuer
approval, nullifier freshness, proof validity, and a non-zero review commitment. Review
text is not submitted to the contracts.

## Monorepo map

```text
apps/web/                 Next.js application and API routes
packages/circuits/        Noir circuit, artifacts, and Node E2E
packages/contracts/       Solidity contracts, deployment script, and Foundry tests
packages/sdk/              @verifytrust/sdk cryptography, proving, and chain APIs
packages/merchant-sdk/     @verifytrust/merchant-sdk issuer and credential utilities
examples/demo-merchant/   Small NOVA GOODS issuer example
docs/                      Technical documentation
scripts/dev-local.sh       Anvil deployment and Next.js local orchestration
```

## Components

### Noir circuit

`packages/circuits/src/main.nr` computes a Poseidon2 credential commitment, issuer key
hash, and nullifier. It checks the public/private bindings, non-zero nonce and secret,
protocol version, and the issuer's Schnorr signature on Grumpkin. The compiled circuit
and verification key are committed under `packages/circuits/target/`.

### Contracts

* `HonkVerifier` is generated from the circuit by Barretenberg.
* `ProofOfReviewVerifier` is a thin wrapper around the generated verifier.
* `IssuerRegistry` lets its OpenZeppelin `Ownable` owner approve or revoke an issuer
  key hash for a merchant.
* `VerifyTrustRegistry` checks the five-input shape, protocol version, issuer
  approval, nullifier freshness, proof, and review commitment, then stores the
  verification record and emits `ReviewVerified`.

The local deployment artifact is `packages/contracts/deployments/31337.json`.
Sepolia deployment addresses are **NOT IMPLEMENTED** in this repository.

### SDK

`@verifytrust/sdk` mirrors the circuit's domain constants and implements field
identifiers, Poseidon2 computations, credential issuance, EVM UltraHonk proof
generation/verification, review commitments, and viem contract helpers. Its proof
module imports the committed circuit JSON; its chain module exports the registry,
issuer, and wrapper ABIs.

### Merchant SDK

`@verifytrust/merchant-sdk` creates an issuer, derives its public key and key hash,
issues credentials, and encodes/decodes credentials as base64url JSON. In the current
v1 demo flow the customer supplies `customerSecret` to the issuer API, so the demo
issuer sees it. Blind issuance is future work.

### Web application and API routes

The Next.js app provides `/`, `/demo`, `/octant`, and `/privacy`. `/demo` generates
demo private data and a customer secret in the browser, obtains a credential from the
issuer route, proves locally, computes a review commitment, and submits through the
relayer route.

* `POST /api/issuer/issue` validates the merchant/product/secret strings and signs
  using `DEMO_ISSUER_PRIVATE_KEY`, or a deterministic development key ending in
  `42` when unset. The timestamp is returned as a JSON string.
* `POST /api/relayer/submit` uses `RELAYER_PRIVATE_KEY`, `RPC_URL`, `CHAIN_ID`, and
  the matching deployment to send the actual registry transaction. It returns an
  explicit `ETHEREUM NOT CONFIGURED — NOT VERIFIED` response when configuration is
  absent; it does not fabricate a transaction hash.
* `GET /api/chain/status` probes `eth_chainId` and reports whether the configured RPC
  is reachable.

## Data flow

```text
REAL PURCHASE → PRIVATE CREDENTIAL → LOCAL ZK PROOF → MINIMAL PUBLIC INPUT → ETHEREUM VERIFICATION → NULLIFIER → VERIFIED REVIEW
```

The merchant/issuer signs the credential after a purchase. The browser executes
Noir witness generation and proving locally. A walletless relayer may submit the
proof; the registry records no caller address.

## Onchain versus offchain data

The proof's protocol inputs are merchant ID, product ID, issuer key hash, nullifier,
and protocol version. The registry additionally stores a review commitment, those
merchant/product/nullifier values, and `verifiedAt` (`block.timestamp`), and emits
the corresponding event. The proof bytes are transaction calldata, and are used for
verification rather than stored in the registry struct.

Review text remains offchain: `createReviewCommitment` hashes the text and rating with
the `verifytrust.review.v1` domain and a salt, and only the resulting commitment is
submitted. The customer secret, nonce, issuer signature, timestamp, raw credential,
identity, email, order ID, receipt, payment data, and purchase history are not
registry fields. This reduced public-data surface lets observers verify eligibility
and duplicate prevention without receiving the underlying transaction record. A
commitment is not currently bound into the ZK proof; this is a known limitation.

## Reproducible build and test commands

```bash
pnpm install
pnpm --filter @verifytrust/sdk build
pnpm --filter @verifytrust/merchant-sdk build
pnpm --filter @verifytrust/circuits build
pnpm -r build
pnpm -r test
pnpm --filter web lint
pnpm --filter web build
pnpm e2e
pnpm dev:local
```

For the circuit's EVM artifacts, `packages/circuits/scripts/build.sh` runs `nargo
compile`, `bb write_vk -t evm`, and `bb write_solidity_verifier -t evm`. Foundry
commands are run from `packages/contracts`, for example `forge test -vv` and
`forge build --sizes`.

## Toolchain versions

The checked-in implementation uses Node `20.20.2`, pnpm `12.3.4`, Foundry `1.8.1`,
Noir/nargo `1.0.0-beta.26`, Barretenberg `5.0.0-nightly.20260522`,
`@noir-lang/noir_js` `1.0.0-beta.26`, `@aztec/bb.js`
`5.0.0-nightly.20260522`, viem `2.21.1`, Next.js `16.3.4`, and React `19.2.8`.
