#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS="$ROOT/../contracts"

cd "$ROOT"
nargo compile
rm -rf target/vk
bb write_vk \
  -b target/proof_of_review.json \
  -o target/vk \
  -t evm
mkdir -p "$CONTRACTS/src/generated"
bb write_solidity_verifier \
  -k target/vk/vk \
  -o "$CONTRACTS/src/generated/HonkVerifier.sol" \
  -t evm
