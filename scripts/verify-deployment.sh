#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIRCUIT="$ROOT/packages/circuits"
CONTRACTS="$ROOT/packages/contracts"
RPC_URL="${RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
TMP_DIR="$(mktemp -d)"
failures=0

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

pass() {
  printf 'PASS  %s\n' "$1"
}

fail() {
  printf 'FAIL  %s\n' "$1"
  failures=$((failures + 1))
}

checksum_for() {
  local file="$1"
  sha256sum "$file" | awk '{print $1}'
}

expected_checksum() {
  local name="$1"
  awk -v name="$name" '$2 == name { print $1 }' "$CIRCUIT/target/CHECKSUMS.txt"
}

printf 'VerifyTrust deployment verification\n'
printf 'RPC_URL=%s\n\n' "$RPC_URL"

(
  cd "$CIRCUIT"
  nargo compile
)

actual_circuit_hash="$(checksum_for "$CIRCUIT/target/proof_of_review.json")"
expected_circuit_hash="$(expected_checksum proof_of_review.json)"
if [[ "$actual_circuit_hash" == "$expected_circuit_hash" ]]; then
  pass "circuit artifact checksum"
else
  fail "circuit artifact checksum (expected $expected_circuit_hash, got $actual_circuit_hash)"
fi

bb write_vk \
  -b "$CIRCUIT/target/proof_of_review.json" \
  -o "$TMP_DIR/vk" \
  -t evm

actual_vk_hash="$(checksum_for "$TMP_DIR/vk/vk")"
expected_vk_hash="$(expected_checksum vk/vk)"
if [[ "$actual_vk_hash" == "$expected_vk_hash" ]]; then
  pass "verification key checksum"
else
  fail "verification key checksum (expected $expected_vk_hash, got $actual_vk_hash)"
fi

actual_vk_hash_file="$(checksum_for "$TMP_DIR/vk/vk_hash")"
expected_vk_hash_file="$(expected_checksum vk/vk_hash)"
if [[ "$actual_vk_hash_file" == "$expected_vk_hash_file" ]]; then
  pass "verification key hash checksum"
else
  fail "verification key hash checksum (expected $expected_vk_hash_file, got $actual_vk_hash_file)"
fi

bb write_solidity_verifier \
  -k "$TMP_DIR/vk/vk" \
  -o "$TMP_DIR/HonkVerifier.sol" \
  -t evm
if cmp -s "$TMP_DIR/HonkVerifier.sol" "$CONTRACTS/src/generated/HonkVerifier.sol"; then
  pass "generated HonkVerifier.sol is byte-identical"
else
  fail "generated HonkVerifier.sol differs from committed output"
  diff -u "$CONTRACTS/src/generated/HonkVerifier.sol" "$TMP_DIR/HonkVerifier.sol" || true
fi

(
  cd "$CONTRACTS"
  forge build
)

compare_runtime() {
  local label="$1"
  local artifact="$2"
  local address="$3"
  local onchain
  onchain="$(cast code "$address" --rpc-url "$RPC_URL")"
  if python3 - "$artifact" "$onchain" "$label" <<'PY'
import json
import re
import sys

artifact = json.load(open(sys.argv[1]))
label = sys.argv[3]

def references_for(kind):
    references = []
    for values in artifact["deployedBytecode"].get(kind, {}).values():
        if isinstance(values, list):
            references.extend(values)
        else:
            for reference_list in values.values():
                references.extend(reference_list)
    return references

def mask_hex(value, references):
    chars = list(value)
    for reference in references:
        start = 2 + reference["start"] * 2
        end = start + reference["length"] * 2
        chars[start:end] = "0" * (end - start)
    return "".join(chars)

all_references = references_for("linkReferences") + references_for("immutableReferences")
local_hex = mask_hex(artifact["deployedBytecode"]["object"].strip(), all_references)
local = bytes.fromhex(local_hex[2:])
match = re.search(r"0x[0-9a-fA-F]+", sys.argv[2])
if not match:
    print("cast code returned no bytecode", file=sys.stderr)
    sys.exit(1)
remote_text = match.group()
remote = bytes.fromhex(remote_text[2:])

def strip_metadata(value):
    if len(value) < 2:
        return value
    metadata_length = int.from_bytes(value[-2:], "big")
    if metadata_length + 2 <= len(value):
        return value[:-(metadata_length + 2)]
    return value

local = bytearray(strip_metadata(local))
remote = bytearray(strip_metadata(remote))
for reference in all_references:
    start = reference["start"]
    length = reference["length"]
    local[start:start + length] = b"\x00" * length
    remote[start:start + length] = b"\x00" * length

if local != remote:
    print(f"{label}: bytecode differs after metadata and immutable masking", file=sys.stderr)
    print(f"local length={len(local)} remote length={len(remote)}", file=sys.stderr)
    sys.exit(1)
PY
  then
    pass "$label deployed bytecode"
  else
    fail "$label deployed bytecode"
  fi
}

compare_runtime \
  "HonkVerifier" \
  "$CONTRACTS/out/HonkVerifier.sol/HonkVerifier.json" \
  "0xE94B6012d80687a62CD140D0bf65E40628D59640"
compare_runtime \
  "ProofOfReviewVerifier" \
  "$CONTRACTS/out/ProofOfReviewVerifier.sol/ProofOfReviewVerifier.json" \
  "0x6936fD59d9fa3e8b1fe3Fe1E74f3fCa9a307e61E"
compare_runtime \
  "IssuerRegistry" \
  "$CONTRACTS/out/IssuerRegistry.sol/IssuerRegistry.json" \
  "0x285696706abe3f7Caa4b31Fa94e18613d06b218c"
compare_runtime \
  "VerifyTrustRegistry" \
  "$CONTRACTS/out/VerifyTrustRegistry.sol/VerifyTrustRegistry.json" \
  "0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45"

expected_honk="0xe94b6012d80687a62cd140d0bf65e40628d59640"
actual_honk="$(cast call 0x6936fD59d9fa3e8b1fe3Fe1E74f3fCa9a307e61E "HONK_VERIFIER()(address)" --rpc-url "$RPC_URL" | tr '[:upper:]' '[:lower:]')"
if [[ "$actual_honk" == "$expected_honk" ]]; then
  pass "ProofOfReviewVerifier.HONK_VERIFIER getter"
else
  fail "ProofOfReviewVerifier.HONK_VERIFIER getter (expected $expected_honk, got $actual_honk)"
fi

expected_proof="0x6936fd59d9fa3e8b1fe3fe1e74f3fca9a307e61e"
actual_proof="$(cast call 0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45 "verifier()(address)" --rpc-url "$RPC_URL" | tr '[:upper:]' '[:lower:]')"
if [[ "$actual_proof" == "$expected_proof" ]]; then
  pass "VerifyTrustRegistry.verifier getter"
else
  fail "VerifyTrustRegistry.verifier getter (expected $expected_proof, got $actual_proof)"
fi

expected_issuer="0x285696706abe3f7caa4b31fa94e18613d06b218c"
actual_issuer="$(cast call 0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45 "issuerRegistry()(address)" --rpc-url "$RPC_URL" | tr '[:upper:]' '[:lower:]')"
if [[ "$actual_issuer" == "$expected_issuer" ]]; then
  pass "VerifyTrustRegistry.issuerRegistry getter"
else
  fail "VerifyTrustRegistry.issuerRegistry getter (expected $expected_issuer, got $actual_issuer)"
fi

total_verifications="$(cast call 0x0F95E2454F5AEdb7aa879A1b2b41d13643141C45 "verificationCount()(uint256)" --rpc-url "$RPC_URL")"
printf '\nOn-chain total verifications: %s\n' "$total_verifications"

if (( failures > 0 )); then
  printf '\nVerification failed: %d check(s)\n' "$failures"
  exit 1
fi
printf '\nVerification passed: all checks\n'
