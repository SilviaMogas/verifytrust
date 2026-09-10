# Privacy Architecture

## Privacy goals

Verify Trust aims to let a verifier check purchase eligibility and one-time review
use without publishing the customer's identity or the underlying transaction. The
credential witness and ZK witness are kept offchain; the public claim is minimized
to the values required by the circuit and registry.

## Non-goals

This implementation does not provide anonymous issuance, guaranteed network
anonymity, a hidden merchant, a hidden product, confidential review text onchain, or
protection against every endpoint, timing, metadata, or side-channel observation.
Eligibility windows are **NOT IMPLEMENTED**, and the demo is not a production issuer.

## Actors

* **Customer:** receives a credential and generates the secret and proof locally.
* **Merchant/issuer:** signs a credential after a purchase and controls its issuer key.
* **Relayer:** submits the proof transaction and pays gas; it need not be the customer.
* **Verifier contract:** checks issuer approval, proof validity, protocol version, and
  nullifier uniqueness, then records the verification.
* **Public observer:** can inspect the proof transaction, event, and registry state.
* **Protocol operator:** deploys contracts, approves issuer hashes, and operates the
  demo infrastructure.

## Trust assumptions

The customer must protect their credential and secret. Issuers are trusted to sign
only eligible purchases and protect private keys. Users must obtain frontend code
from a trusted source; the browser runtime and cryptographic dependencies are not
assumed infallible. The relayer is not trusted with a user wallet, but it can observe
requests it receives. Ethereum, the deployed bytecode, and deployment configuration
are relied on for public verification.

## Private inputs

The circuit witness includes merchant ID, product ID, purchase timestamp, purchase
nonce, customer secret, issuer public-key coordinates, and the issuer signature.
The web demo also creates an example email, order ID, and receipt locally. These
values are displayed as private data and are not sent to the registry. The raw
credential, secret, nonce, identity, email, order ID, receipt, payment details, and
purchase history are not registry fields.

## Public inputs

The proof exposes five values in this order: merchant ID, product ID, issuer key
hash, nullifier, and protocol version. The registry additionally receives a review
commitment and records the merchant, product, nullifier, commitment, and block
timestamp. The proof bytes are transaction calldata used by the generated verifier.

## Credential lifecycle

After a purchase, an issuer signs a credential using the credential commitment as
the Schnorr message. The merchant SDK can serialize it as base64url JSON. In v1 the
customer device generates `customerSecret` but the demo sends that value to
`/api/issuer/issue`; therefore the demo issuer sees it. Blind issuance is future work.
The customer then executes the circuit and submits a proof through a relayer.

## Local proof generation

The SDK executes Noir and UltraHonk in the browser using WASM-compatible packages.
The witness is constructed in the browser and is not sent to the relayer; only proof
bytes, five public inputs, and a review commitment are submitted after local
verification. The implementation does not claim that browser memory, timing, or
hardware side channels are impossible.

## Issuer model

`IssuerRegistry` stores approval for an `(merchantId, issuerKeyHash)` pair. Its
OpenZeppelin `Ownable` owner can approve and revoke hashes. The circuit authenticates
the credential with the issuer's public key and signature; the registry separately
checks that the derived issuer key hash is approved for the merchant.

## Nullifier

The nullifier is `Poseidon2([2, customer_secret, purchase_nonce, product_id], 4)`.
It is public and is marked used before a successful registry call returns. A second
submission with the same nullifier reverts with `NullifierAlreadyUsed`, providing
replay protection at the registry.

Determinism also creates correlation considerations: observers who know the same
secret, nonce, product scope, and nullifier can recognize reuse. The nullifier does
not reveal those inputs by itself, but it is a stable public value for that scope.

## Ethereum verification

The relayer calls `VerifyTrustRegistry.submitVerifiedReview`. The contract checks
input length, version, issuer approval, nullifier freshness, generated proof validity,
and non-zero commitment. Anyone may call it; the contract deliberately stores no
`msg.sender`. The event and state are publicly inspectable.

## Storage model

The registry stores only `ReviewVerification`:
`reviewCommitment`, `productId`, `merchantId`, `nullifier`, and `verifiedAt`.
The review text is never passed to the contract. The relayer route does not persist a
database record. The issuer route returns a credential JSON response, and server
logs/deployment infrastructure may still have ordinary request metadata depending
on hosting configuration.

## Metadata leakage

Ethereum calldata, block timing, gas behavior, event data, RPC traffic, and the
public nullifier remain observable. A review commitment hides the text under the
hash assumption but does not hide that a commitment was submitted. RPC, browser,
server, and access logs may reveal IP addresses or request timing.

## Wallet correlation

The demo relayer model requires no user wallet. The relayer sees the submitter's IP
and proof request, and the onchain transaction identifies the relayer account rather
than the customer's wallet. This reduces direct wallet linkage, but it does not
remove network-level correlation or identify the relayer's infrastructure.

## Timing attacks

An observer able to see issuance requests and proof submissions can compare
issuance-to-submission timing, especially for a distinctive merchant/product. The
registry's `verifiedAt` is `block.timestamp`, so block inclusion time is public and
coarser than a request timestamp but still useful for correlation.

## Known limitations

The demo issuer sees `customerSecret`; blind issuance is future work. The review
commitment is not bound inside the proof. The relayer sees submitter IP and request
metadata. Nullifiers are public stable values within their scope. There is no
external audit, no production issuer, no eligibility-window logic, and no guarantee
against a malicious frontend or browser side channel.

## Future hardening

Future work includes blind issuance, binding the review commitment as a proof public
input, batching or delayed submission to reduce timing correlation, merchant-side
Merkle issuer sets, and independent security audits. Network privacy and browser
side-channel defenses would also require explicit production design.
