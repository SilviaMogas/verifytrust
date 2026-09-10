# Project History

Verify Trust is not a project created for the Octant Epoch 13 Privacy Round. It
originated in 2023 as a blockchain-backed Proof of Review concept, and the
privacy-preserving zero-knowledge protocol in this repository is its 2026
evolution.

> Verify Trust originally focused on proving that a review came from a real
> customer. The 2026 protocol rebuild focuses on solving the harder problem:
> proving that claim without identifying the customer.

## 2023 — Proof of Review, first generation

Founded by Silvia Mogas (CEO) with Fernando (CTO). The 2023 product, as
documented in the original investor deck (`VerifyTrust.Tech (long) LUX`):

- **Proof of Review Protocol (POR)** — blockchain-backed verification that a
  review came from a real customer of the merchant.
- **Verify Trust Hub prototype** — a reviews marketplace where customers own
  their reviews and are rewarded for valuable contributions
  (`verifytrusthub.com`).
- **Digital identity concept** — non-transferable, traceable soulbound tokens
  (SBTs) attached to a customer identity, with optional KYC.
- **Web2.5 / Web3 onboarding** — magic-link login for non-crypto users plus
  wallet-based access for Web3 users.

The 2023 design verified reviewers by *linking* a review to an identity
(a soulbound token). It did **not** include zero-knowledge proofs or any
privacy-preserving verification. That is precisely the gap the 2026 protocol
addresses.

## Milestones and recognition

| When | Milestone | Source |
| --- | --- | --- |
| 2023 | Selected as **Best Idea** at the **CEIN Awards** (Navarra, Spain; CEIN is the Navarra Government's business-innovation agency) | Founder-reported |
| 2023 | Finalist, **Initiate Awards 2023**, run by the Navarra Government through CEIN | 2023 deck, "Market adoption" |
| 2023 | Selected by **ACCIÓ** (Catalan Government agency) to represent Catalonia at **Web Summit Lisbon 2023** | 2023 deck, "Market adoption" |
| 2023 | Speaker / pitch slots at NFT Lakeside (Zurich), Best of Blockchain (Berlin), World Token Congress (Madrid), BDZ (Zaragoza), 1000x Global (Metaverse) | 2023 deck, "Conferences" (listed as confirmed at the time; attendance not independently verified) |
| — | **Incubated by The LIST** (Luxembourg) | Founder-reported |

Everything marked "Founder-reported" comes directly from the founder and has
not been independently verified inside this repository. Roadmap projections
from the 2023 deck (company counts, user counts, funding rounds, token plans)
are **not** treated as achieved results and are intentionally omitted here.

## 2024 – 2025 — Pause and reassessment

The first-generation identity-linked approach proved to be in tension with the
privacy expectations of customers and with data-protection obligations for
merchants: proving "real customer" by linking a review to an identity means the
platform must collect and hold exactly the data it should not need. No new
product releases from this period are claimed.

## 2026 — Protocol rebuild: privacy-preserving Proof of Review

This repository. The core question changed from *"is this reviewer a real
customer?"* to *"can this person prove they are eligible to review, without
telling anyone who they are?"*

What exists today (see [OCTANT_READINESS.md](./OCTANT_READINESS.md) for the
evidence-backed status of each item):

- A Noir circuit (`packages/circuits`) that proves possession of a
  merchant-signed purchase credential, matches it to the product being
  reviewed, and derives a deterministic nullifier — without revealing the
  credential, the customer secret, or any transaction data.
- Solidity contracts (`packages/contracts`) that verify the proof on Ethereum,
  gate on approved issuers, and enforce one-purchase-one-review via nullifiers.
- A TypeScript SDK and a merchant SDK.
- A working local end-to-end demo (`/demo`) and an Octant reviewer page
  (`/octant`).

What does **not** exist yet and is not claimed: production merchants, live
customers, transaction volume, an external audit, or funding for the 2026
rebuild.

## Continuity

The name, the Proof of Review mission, and the founding team are the same as in
2023. The verification mechanism is new. The 2023 work is what taught the team
that "verified" and "surveilled" must be decoupled — and the 2026 protocol is
the answer to that lesson: **verify the claim, not the person.**
