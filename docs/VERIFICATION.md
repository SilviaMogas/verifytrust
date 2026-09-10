# Independent verification

The repository includes a reproducibility check for the privacy-critical
circuit, generated EVM verifier, Solidity contracts, and the Sepolia
deployment:

```bash
pnpm verify:deployment
```

## Prerequisites

- Node.js 20 and pnpm;
- Noir `nargo`;
- Barretenberg `bb`, using the version pinned by the circuit toolchain;
- Foundry (`forge` and `cast`);
- network access to the Sepolia RPC (or `RPC_URL=<endpoint>`).

The script runs `nargo compile` in `packages/circuits`, then uses the same
commands as `packages/circuits/scripts/build.sh`:

```bash
bb write_vk -b target/proof_of_review.json -o target/vk -t evm
bb write_solidity_verifier -k target/vk/vk -o ../contracts/src/generated/HonkVerifier.sol -t evm
```

For verification, the generated VK is written to a temporary directory and
the generated Solidity verifier is compared byte-for-byte with the committed
`packages/contracts/src/generated/HonkVerifier.sol`. The circuit artifact,
verification key, and verification-key hash are compared with the SHA-256
values in `packages/circuits/target/CHECKSUMS.txt`.

The script then runs `forge build`. For each deployed Sepolia contract it
compares local and on-chain runtime bytecode after removing the Solidity CBOR
metadata tail. Solidity immutable locations are masked using Foundry's
`immutableReferences`; the corresponding constructor values are independently
checked with `HONK_VERIFIER()`, `verifier()`, and `issuerRegistry()` getters.
Finally, `verificationCount()` is read from the deployed registry and printed.

The script prints a PASS/FAIL table and exits non-zero on any mismatch. It does
not replace a mismatch with a looser comparison; if Barretenberg produces a
different verifier, the exact unified diff is printed.

For the deployed Sepolia instance, the four contracts were created in block
`11675562`, which is recorded in `packages/sdk/src/deployments.ts` and used as
the starting block for `ReviewVerified` event metrics.
