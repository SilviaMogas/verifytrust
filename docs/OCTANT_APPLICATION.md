# Octant Epoch 13 — Privacy Round — Application Draft

Status: **DRAFT** for Silvia's review. Every factual claim below is backed by
code in this repository or explicitly marked. Items marked `[FILL]` need a
value that only the team can provide. Do not submit sections marked
`NOT VERIFIED`.

---

## Project name

Verify Trust

## One-line description

Verify Trust is a privacy-preserving Proof of Review protocol that lets
customers prove they made an eligible purchase without revealing their identity
or transaction data.

## Tagline

PROVE THE PURCHASE. PROTECT THE PERSON.

## Links

| | |
| --- | --- |
| Repository | https://github.com/SilviaMogas/verifytrust |
| Live demo | `[FILL — deployed /demo URL]` |
| Reviewer page | `[FILL — deployed /octant URL]` |
| License | Apache-2.0 |
| Circuit | `packages/circuits/src/main.nr` |
| Contracts | `packages/contracts/src/` |
| Sepolia deployment | [VerifyTrustRegistry on Sepolia](https://sepolia.etherscan.io/address/0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45) · `packages/contracts/deployments/11155111.json` |

## Eligibility criteria → evidence

| Criterion | Evidence |
| --- | --- |
| Open source | Apache-2.0 license in `LICENSE` and the repository. |
| Independently buildable | `pnpm verify:deployment` rebuilds the circuit and verifier, checks `CHECKSUMS.txt`, builds the Solidity contracts, and compares the Sepolia bytecode. |
| Working software | Live demo at https://verifytrust2.vercel.app and the Longhand pilot at `/merchant/longhand`, including the Stripe test-mode purchase and verified-review flow. |
| Verifiable traction | `/api/stats` reports Sepolia `ReviewVerified` event totals and distinct merchants, with the published review transaction [0x765e7b93…](https://sepolia.etherscan.io/tx/0x765e7b93622f61e37a12f6382cae9bb8fba0759f7bda7ec23f3ee9de5544a745). The requested `0xec1219…` prefix was checked and does not resolve to a VerifyTrust Sepolia transaction; it is not claimed as project evidence. |
| Exclusion criteria | Testnet-only deployment, explicit limitations, open-source code, privacy documentation, and the demo-only issuer/relayer threat model are documented rather than presented as production guarantees. |
| Repository status | repository visibility: to be set public before submission |

## The privacy problem

Review verification today usually works by linking a review to a person:
platforms collect or process emails, order IDs, receipts and payment details to
prove that a reviewer actually bought the product. The "verified purchase" badge
is paid for with customer data. Every extra dataset of who-bought-what is a
breach waiting to happen and a surveillance surface that has nothing to do with
whether a review is legitimate.

The internet does not need to know who left a verified review. It only needs
proof that the reviewer had the right to leave it.

## The solution

Verify Trust replaces identity-based verification with cryptographic proof of
eligibility.

1. After a real purchase, the merchant issues the customer a **private purchase
   credential**: a Schnorr-signed commitment over `merchantId`, `productId`,
   `purchaseTimestamp`, a random `purchaseNonce` and a customer-held
   `customerSecret`.
2. When the customer wants to leave a review, a **zero-knowledge proof is
   generated locally** (Noir + Barretenberg UltraHonk, in the browser). The
   proof shows the customer holds a valid credential from an approved issuer for
   the product being reviewed and knows the customer secret.
3. The proof exposes only five public inputs: `merchantId`, `productId`,
   `issuerKeyHash`, a deterministic **nullifier**, and the protocol version.
4. An Ethereum contract verifies the proof, checks the issuer is approved,
   rejects any nullifier that has been used before, and records a verification
   containing only a review commitment, product, merchant, nullifier and
   timestamp. The review text stays off-chain.

ONE ELIGIBLE PURCHASE = ONE VERIFIED REVIEW, with no one learning which
purchase or which customer.

## How privacy is core to the product (not a setting)

Without privacy-preserving proof generation, the protocol does not fulfil its
purpose. Privacy is part of the verification mechanism itself rather than an
optional user setting:

- The circuit's *private* witness contains the credential and customer secret;
  the *public* inputs contain no identifier of the customer. There is no mode in
  which the customer's data is verified in the clear.
- The nullifier is derived from `customerSecret` and `purchaseNonce`, so the
  duplicate-review check works without any identity.
- Submission is relayed: the customer never signs an Ethereum transaction, so no
  customer wallet appears on-chain.
- What is stored on-chain is the minimum required for public verifiability:
  commitment, merchant, product, nullifier, timestamp.

## Why Ethereum (real and technically necessary)

Ethereum provides neutral public verification, issuer state and nullifier
enforcement, while ZK keeps purchase information private.

- **Nullifier enforcement needs a shared, tamper-evident state.** "This purchase
  has already produced a verified review" must be checked against a single
  source of truth that no merchant or platform controls. A merchant database
  could silently reset nullifiers; a public chain cannot.
- **Issuer registry as public governance.** Which merchant keys are trusted is
  itself public state that reviewers and competitors can inspect.
- **Independent verifiability.** Anyone can re-verify a review's proof against
  the on-chain verifier and confirm the nullifier's status, without trusting
  Verify Trust.

Current target: Ethereum Sepolia (testnet). Mainnet/L2 deployment is future
work.

## Open source and reproducibility

- All privacy-critical code (circuit, verifier, contracts, SDK) is in this
  repository under Apache-2.0.
- Independent build: `nargo compile`, `bb write_vk -t evm`,
  `bb write_solidity_verifier`, `forge test`, `pnpm e2e` — documented in
  `docs/ARCHITECTURE.md` with pinned toolchain versions and artifact checksums
  (`packages/circuits/target/CHECKSUMS.txt`).
- repository visibility: to be set public before submission.

## Public-good value: a reusable primitive

Verify Trust is not only a review product. The reusable primitive is:

**PRIVATELY PROVE ELIGIBILITY TO MAKE A PUBLIC CLAIM.**

Reviews are the first implementation. The same credential → local proof →
nullifier → public verification pattern applies to hotel and marketplace
reviews, employer reviews, event attendance, professional credentials,
governance participation, product feedback and proof of experience. The SDK and
circuit are written so that "product" and "merchant" are opaque field
identifiers; nothing in the protocol is specific to e-commerce.

## Project history and validation

Verify Trust started in 2023 as a blockchain-backed Proof of Review protocol
with a soulbound-token identity model. It was selected as Best Idea at the CEIN
Awards (Navarra), was a finalist of the Initiate Awards 2023, was selected by
ACCIÓ to represent Catalonia at Web Summit Lisbon 2023, and has been incubated
by The LIST in Luxembourg. The 2026 rebuild replaces identity linking with
zero-knowledge eligibility proofs. Full history: `docs/PROJECT_HISTORY.md`.

Traction metrics (users, merchants, volume): `NOT VERIFIED` — none are claimed.

## Team

- Silvia Mogas — Founder / CEO. `[FILL — one line]`
- `[FILL — current technical contributors]`

## Use of Epoch funding

Funding is requested for protocol hardening and openness, not for marketing.

| Area | What it funds |
| --- | --- |
| Production-grade circuits | Range-checked eligibility windows, binding the review commitment into the proof, pinned (non-nightly) Barretenberg release |
| External cryptographic review | Independent review of circuit, nullifier design and contracts |
| Merchant issuer SDK | Blind issuance so the issuer never sees the customer secret; key management; reference server |
| Metadata protection | Delayed/batched submission, relayer diversity, timing-correlation mitigations |
| Walletless / gasless UX | Production relayer with abuse protection, paymaster/4337 evaluation |
| Ethereum production hardening | Mainnet/L2 deployment, upgrade and pause strategy, gas optimisation |
| Issuer governance | Multi-party control of the issuer registry, merchant onboarding rules |
| Developer documentation | Spec, integration guides, verifier reference implementations |
| Merchant pilots | Two to three real merchants issuing credentials on testnet, then mainnet |
| Privacy research | Correlation analysis of nullifier and timing metadata |
| Open Proof of Review specification | Vendor-neutral spec so other implementations can interoperate |

Requested amount: `[FILL]`.

## Known limitations (stated openly)

- Demo issuer receives the `customerSecret` in v1 (blind issuance is future
  work).
- The review commitment is not bound inside the proof; a malicious relayer
  could pair a valid proof with a different commitment. The nullifier is still
  consumed, so no duplicate is possible, but the review content binding relies
  on the relayer.
- Relayer sees the submitter's IP address and proof.
- Purchase timestamp is carried in the credential but not range-checked in the
  circuit (no eligibility windows yet).
- Barretenberg is a nightly build; no external audit.
- Testnet only; a demo merchant only.

## Claims we can safely make

- Working Noir ZK circuit with Schnorr-signed credentials and Poseidon2
  nullifiers.
- Generated UltraHonk Solidity verifier; contracts with issuer registry and
  nullifier enforcement; Foundry tests using real proofs.
- Browser-side proof generation; relayed, walletless submission.
- End-to-end demo including duplicate-review rejection.
- Apache-2.0; reproducible build documented.
- 2023 origin with the milestones listed above.

## Claims we must NOT make

- Any users, customers, merchant integrations, transaction volume or revenue.
- Any audit, security review, or "battle-tested" status.
- Mainnet deployment.
- That ZK privacy existed in the 2023 product.
- Full anonymity (metadata and timing correlation remain).
- Shopify or other e-commerce integrations (none implemented).
