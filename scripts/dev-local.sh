#!/usr/bin/env bash
set -euo pipefail

export PATH="/home/ubuntu/.foundry/bin:/home/ubuntu/.bb:/home/ubuntu/.nargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
export CHAIN_ID="${CHAIN_ID:-31337}"
export DEMO_ISSUER_PRIVATE_KEY="${DEMO_ISSUER_PRIVATE_KEY:-0x$(printf '0%.0s' {1..62})42}"
export RELAYER_PRIVATE_KEY="${RELAYER_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
export RPC_URL

pnpm --filter @verifytrust/sdk build >/dev/null
pnpm --filter @verifytrust/merchant-sdk build >/dev/null
export DEMO_MERCHANT_ID="$(node --input-type=module -e 'import { fieldFromString } from "./packages/sdk/dist/index.js"; console.log(fieldFromString("nova-goods"))')"
export DEMO_ISSUER_KEY_HASH="$(node --input-type=module -e 'import { createIssuer } from "./packages/merchant-sdk/dist/index.js"; console.log((await createIssuer({privateKey: process.env.DEMO_ISSUER_PRIVATE_KEY})).issuerKeyHash)')"

if ! curl -sf "$RPC_URL" >/dev/null 2>&1; then
  anvil --silent >/tmp/verifytrust-anvil.log 2>&1 &
fi
for _ in $(seq 1 50); do
  curl -sf "$RPC_URL" >/dev/null 2>&1 && break
  sleep .2
done
pnpm --dir "$ROOT/packages/contracts" exec forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url "$RPC_URL" --private-key "$RELAYER_PRIVATE_KEY"
pnpm --filter web dev
