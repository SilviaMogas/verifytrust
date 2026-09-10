# Threat Model

The entries below describe current controls and residual risk; none is an absolute
security claim.

| Threat | Impact | Current mitigation | Remaining limitation |
|---|---|---|---|
| Fake merchant | A user may receive a credential from an untrusted merchant. | Issuer approval is keyed by merchant ID and issuer key hash. | The protocol does not independently establish that a merchant is reputable or that a purchase occurred. |
| Malicious merchant | The issuer can sign fabricated or unfair credentials. | Issuers are explicit approved keys; Schnorr signatures authenticate the signer. | An approved issuer can still issue fraudulent credentials until revoked. |
| Fraudulent credential issuance | Ineligible users may obtain signed credentials. | Issuance policy is outside the circuit; registry only checks signature/key approval. | The protocol cannot audit merchant purchase records or enforce eligibility windows. |
| Credential theft | A stolen credential may be used to produce a valid proof. | Customer secret and nonce are witness values; nullifier prevents repeat use. | A thief who obtains an unused credential may submit it; secure storage is required. |
| Credential resale | An eligible credential may be transferred to another person. | No user wallet is required and the proof checks knowledge of credential values. | The current v1 credential is not bound to a person or device. |
| Duplicate reviews | The same purchase may be submitted repeatedly. | Deterministic nullifier and `nullifierUsed` registry mapping reject reuse. | The nullifier scope is product/secret/nonce; broader review-policy scopes are future work. |
| Proof replay | A previously valid proof may be replayed. | The registry checks the nullifier before verification and marks it used on success. | A proof can be replayed until its first successful use; proof expiration is not implemented. |
| Sybil merchants | Many merchant IDs may dilute trust or spam the registry. | Owner-controlled issuer approval is required for each pair. | There is no decentralized merchant governance, rate limit, or reputation layer. |
| Compromised issuer keys | An attacker can sign credentials for an approved merchant. | Owner can revoke the issuer key hash. | Previously issued credentials are not automatically revoked; key rotation policy is external. |
| Wallet correlation | A user's wallet could reveal their review activity. | Relayer submission means the demo does not require a user wallet. | Relayer IP, RPC, and offchain timing can still correlate a person with a transaction. |
| Timing correlation | Issuance and submission events may be linked. | No timing obfuscation is implemented. | Public block timestamps and service logs leave a correlation window. |
| Metadata leakage | Logs or calldata may expose relationships or activity. | Private fields are kept out of registry storage; only a commitment is stored. | IPs, request times, gas, public IDs, nullifiers, and event data remain observable. |
| Malicious frontend | A modified UI could exfiltrate secrets or send misleading requests. | The cryptographic circuit still constrains a submitted proof. | Browser code is an endpoint trust boundary; users must verify the deployed frontend. |
| Malicious relayer | A relayer may censor, reorder, inspect, or alter submissions. | The contract verifies proof and public inputs itself; anyone may call. | The relayer sees its request/IP context and can delay or refuse service. |
| Database compromise | Stored service data could expose private transaction context. | The current relayer route has no application database and the registry stores minimal fields. | Hosting logs, issuer systems, or future databases may retain metadata; this is not eliminated. |
| Proof-generation side channels | Browser timing or memory observation could reveal witness information. | Proof generation is local, avoiding routine witness upload. | No formal constant-time, hardware-isolation, or side-channel proof is claimed. |
