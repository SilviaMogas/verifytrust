---
name: verifytrust-sepolia-testing
description: Run the Verify Trust browser demo against existing Sepolia deployments with bounded transaction spending.
---

# Verify Trust Sepolia browser testing

- Read `apps/web/AGENTS.md`. Repo is a pnpm monorepo; use Node 20. If pnpm is absent from the shell PATH, locate the installed NVM Node 20 bin directory and prepend it (on the tested machine `/home/ubuntu/.nvm/versions/node/v20.20.2/bin`).
- Reuse existing dependencies/build artifacts when available. Check port 3000 before starting `pnpm --filter web dev`; avoid concurrent Next dev processes using the same `.next` directory. Leave unrelated Anvil running.
- For an existing Sepolia deployment, set `CHAIN_ID=11155111`, `RPC_URL=https://ethereum-sepolia-rpc.publicnode.com`, `NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io`, and the issuer/relayer keys below. Do not run `scripts/dev-local.sh` for this scenario: it deploys contracts and defaults to Anvil.
- Confirm addresses from `packages/contracts/deployments/11155111.json`; issuer must already be approved and relayer funded. Keys must stay server-only.
- `/demo` is stateful in memory. Generate credential → continue → generate private proof → write review → compute commitment → verify → attempt duplicate → resubmit. Test duplicate before leaving the page: automated browsers may replace the current tab on explorer navigation even when the anchor has `target="_blank"`, and Back/reload loses state.
- Observe the browser proof timing and five named public inputs; record network request bodies only for `/api/relayer/submit`, which should contain `proof`, `publicInputs`, and `reviewCommitment`, never demo PII.
- Check the actual Etherscan transaction status and recipient, not only UI badges. Budget for variable gas; observed submissions used approximately 3.69M gas. Keep transaction counts explicitly bounded.
- Duplicate rejection can happen during RPC preflight instead of mining. Record the response error name and wallet nonce/transaction evidence to distinguish it from a mined revert.
- If HTTP400 image errors appear only during screenshot/DOM capture, inspect the exact request URL: testing tooling may request a truncated `/_next/image?...&...` URL. A plain Playwright reload and console listener can separate capture artifacts from genuine app errors.
- RPC checks through the existing Node SDK worked where Python urllib received HTTP403; use the configured SDK transport for read-only receipt/nonce checks.

## Devin Secrets Needed
- `RELAYER_PRIVATE_KEY`: funded Sepolia-only signing wallet.
- `DEMO_ISSUER_PRIVATE_KEY`: approved NOVA GOODS issuer.
- On the tested machine these were provisioned in `/home/ubuntu/.verifytrust/verifytrust-sepolia-keys.txt`. Parse values without printing them. Do not copy secrets into repository files or artifacts.
