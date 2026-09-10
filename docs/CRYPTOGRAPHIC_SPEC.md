# Cryptographic Specification

## Proving system

The circuit uses Noir `1.0.0-beta.26` and UltraHonk through Barretenberg
`5.0.0-nightly.20260522`. The circuit is compiled and proved with the EVM/Keccak
target (`-t evm` in the CLI). The JavaScript path uses the pinned
`@noir-lang/noir_js` and `@aztec/bb.js` packages.

## Hash primitive

Hashing uses Poseidon2 from the `noir-lang/poseidon` `v0.3.0` package. The SDK calls
Barretenberg's `poseidon2Hash` with 32-byte field encodings and checks parity with the
Noir computation.

## Credential format

The SDK `Credential` contains `merchantId`, `productId`, `purchaseTimestamp` (`bigint`),
`purchaseNonce`, `customerSecret`, issuer public key coordinates `x` and `y`, a
64-byte `signature`, and `protocolVersion: 1`. Field-like values are canonical
32-byte hexadecimal values (`0x` plus 64 hex digits) below the BN254 field modulus.
The merchant SDK serializes the timestamp as a decimal string and transports the JSON
as unpadded base64url. Decoding restores the timestamp to `bigint`.

## Issuer signature

Issuers use Schnorr on the Grumpkin embedded curve from `noir-lang/schnorr` `v0.4.0`.
The message is the field-valued credential commitment. `issueCredential` derives the
public key and calls bb.js `schnorrConstructSignature`.

The external credential signature is 64 bytes: 32 bytes for `s`, followed by 32 bytes
for `e`. In `scalar_from_bytes(bytes, offset)`, the circuit reads each 32-byte half
as two 16-byte limbs in big-endian byte order and passes
`EmbeddedCurveScalar::new(lo, hi)` to the Noir Schnorr verifier. The first half is
read at offset `0`; the second at offset `32`.

## Commitment construction

With domain constants `DOMAIN_CREDENTIAL = 1`, `DOMAIN_NULLIFIER = 2`, and
`DOMAIN_ISSUER = 3`:

```text
credential_commitment =
  Poseidon2([1, merchant_id, product_id, purchase_timestamp,
             purchase_nonce, customer_secret], 6)

issuer_key_hash =
  Poseidon2([3, issuer_pk_x, issuer_pk_y], 3)
```

The SDK's `fieldFromString` first computes Keccak-256 of UTF-8 text and reduces the
integer modulo the BN254 field modulus. This is used for identifiers such as
`nova-goods` and `nova-travel-bottle`.

## Private witness

The private witness is `merchant_id`, `product_id`, `purchase_timestamp`,
`purchase_nonce`, `customer_secret`, `issuer_pk_x`, `issuer_pk_y`, and `signature`.
The witness also supplies the values from which the five public values are checked;
the private credential and signature are not protocol public inputs.

## Public inputs

The effective protocol-level public input order is:

1. `merchant_id`
2. `product_id`
3. `issuer_key_hash`
4. `nullifier`
5. `protocol_version`

They are Noir `Field` values and are represented at the EVM boundary as `bytes32`
values. The SDK formats numeric values as zero-padded 32-byte hexadecimal values.
The generated Honk verifier reports `NUMBER_OF_PUBLIC_INPUTS = 13` internally:
the additional eight values are Barretenberg pairing-point inputs. Its external
verifier requires five caller-supplied inputs, matching the circuit ABI.

## Circuit constraints

`main.nr` contains these assertions:

```text
merchant_id == pub_merchant_id
product_id == pub_product_id
issuer_key_hash == pub_issuer_key_hash
nullifier == pub_nullifier
pub_protocol_version == PROTOCOL_VERSION
purchase_nonce != 0
customer_secret != 0
verify_signature(public_key, (sig_s, sig_e), credential_commitment)
```

The first seven assertions bind the credential to the public claim and reject empty
nonce/secret values. The final assertion validates the issuer signature over the
computed commitment.

## Nullifier formula

```text
nullifier =
  Poseidon2([2, customer_secret, purchase_nonce, product_id], 4)
```

The nullifier is deterministic for this credential scope and is supplied as public
input four (zero-based index 3).

## Domain separation

The leading domain field distinguishes credential commitments, nullifiers, and issuer
key hashes. `PROTOCOL_VERSION = 1` is a separate public field and is checked by both
the circuit and `VerifyTrustRegistry`.

## Verification process

In JavaScript, the SDK constructs Noir inputs, executes the committed circuit with
`new Noir(circuit)`, and passes its witness to:

```ts
const proofData = await backend.generateProof(witness, {
  verifierTarget: "evm",
});
const verified = await backend.verifyProof(proofData, {
  verifierTarget: "evm",
});
```

`generateProof` returns proof bytes, the five public inputs, and the computed nullifier.
The browser runs this path locally; the relayer receives only the proof request.

## Ethereum verifier

`packages/contracts/src/generated/HonkVerifier.sol` is generated from the verification
key and is not hand-edited. `ProofOfReviewVerifier.verify` delegates directly to it.
`VerifyTrustRegistry.submitVerifiedReview` checks, in order:

1. exactly five public inputs;
2. protocol version 1;
3. approved `(merchantId, issuerKeyHash)` in `IssuerRegistry`;
4. an unused nullifier;
5. the generated verifier, converting a revert or false result to `InvalidProof`;
6. a non-zero review commitment.

It then marks the nullifier used, stores the five-field verification record (with
`verifiedAt`), increments the count, and emits `ReviewVerified`. Any caller may submit.

## Security assumptions

The design assumes the pinned Noir, Poseidon2, Schnorr, and Barretenberg
implementations are correct for their configured versions; the generated verifier and
deployment addresses are authentic; approved issuers protect their private keys and
issue credentials according to their purchase records; and users protect credentials
and secrets. Ethereum consensus and the configured relayer are assumed to execute
the contract as deployed. These assumptions do not constitute an audit or an
absolute security guarantee.

## Known limitations

* The review commitment is not a circuit public input and is not bound to the proof.
  A relayer could pair a valid proof with another non-zero commitment; nullifier
  consumption limits repeated use, while binding the commitment is future work.
* `purchase_timestamp` is not range-checked.
* Eligibility windows are **NOT IMPLEMENTED**.
* The implementation depends on a nightly Barretenberg release.
* There is no external security audit.

The valid Noir test vector uses merchant `11`, product `22`, timestamp `33`, nonce
`44`, and customer secret `55`. It produces:

```text
issuer_key_hash =
0x23d61f92a331e4bb8a3b66276d35faa307aab35088de5ebe3db66fe20a93c7d5
nullifier =
0x2ba61bf5921cc0778266a61fae59df0d767602e9c5ff2588bde14c2471b0e4d9
```
