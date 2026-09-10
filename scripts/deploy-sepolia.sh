#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/home/ubuntu/.foundry/bin:/home/ubuntu/.bb:/home/ubuntu/.nargo/bin:$PATH"

: "${SEPOLIA_DEPLOYER_PRIVATE_KEY:?Set SEPOLIA_DEPLOYER_PRIVATE_KEY}"
: "${DEMO_ISSUER_PRIVATE_KEY:?Set DEMO_ISSUER_PRIVATE_KEY}"
: "${RPC_URL:?Set RPC_URL}"

export CHAIN_ID=11155111
pnpm --filter @verifytrust/sdk build >/dev/null
pnpm --filter @verifytrust/merchant-sdk build >/dev/null
export DEMO_MERCHANT_ID="$(cd "$ROOT" && node --input-type=module -e 'import { fieldFromString } from "./packages/sdk/dist/index.js"; console.log(fieldFromString("nova-goods"))')"
export DEMO_ISSUER_KEY_HASH="$(cd "$ROOT" && node --input-type=module -e 'import { createIssuer } from "./packages/merchant-sdk/dist/index.js"; const issuer = await createIssuer({privateKey: process.env.DEMO_ISSUER_PRIVATE_KEY}); console.log(issuer.issuerKeyHash)')"

pnpm --dir "$ROOT/packages/contracts" exec forge script script/Deploy.s.sol:Deploy \
  --broadcast \
  --rpc-url "$RPC_URL" \
  --private-key "$SEPOLIA_DEPLOYER_PRIVATE_KEY"
