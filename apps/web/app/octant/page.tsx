import Link from "next/link";
import { deployments } from "@verifytrust/sdk";
import { Footer, Nav } from "../components";

const sections: [string, string][] = [
  ["THE PRIVACY PROBLEM", "Reviews become more credible when eligibility is proven, but conventional verification exposes receipts, accounts, and identity."],
  ["THE ZK PRIMITIVE", "A local Noir circuit verifies an issuer signature, approved product, purchase credential, and deterministic nullifier while exposing only five public inputs."],
  ["WHAT THE PROTOCOL PROVES", "Possesses a valid credential. Issued by an approved merchant. Corresponds to the product reviewed. Purchase eligible. Knows customer secret. Transaction data not revealed. Valid nullifier generated. The same purchase cannot produce multiple verified reviews for the same scope."],
  ["WHAT THE PROTOCOL NEVER REVEALS", "Identity · Email · Receipt · Order number · Payment details · Transaction ID · Nonce · Secret · Raw credential · Purchase history"],
  ["WHY ETHEREUM", "Neutral public verification and durable nullifier enforcement make the claim portable across applications."],
  ["LIVE DEMO", "Generate a credential, prove eligibility locally, and submit a real Ethereum transaction (Sepolia testnet or local Anvil)."],
  ["SOURCE CODE", "Open source repository: github.com/SilviaMogas/verifytrust"],
  ["CIRCUIT", "packages/circuits/src/main.nr · public inputs: merchant ID, product ID, issuer key hash, nullifier, protocol version. Constraints bind merchant and product, issuer approval hash, Schnorr signature, nullifier, protocol version, and nonzero nonce and secret."],
  ["CONTRACTS", "IssuerRegistry approves issuers. ProofOfReviewVerifier wraps the generated verifier. VerifyTrustRegistry enforces approval, validity, replay prevention, and review registration."],
  ["TESTS", "Noir: valid_credential plus five negative tests (6). Foundry: 3 IssuerRegistry access-control tests plus 10 VerifyTrustRegistry tests (13). SDK: 4 Vitest tests. Merchant SDK: 1 Vitest test. The Node end-to-end script covers proving, verification, replay rejection, and an independent purchase."],
  ["PRIVACY ARCHITECTURE", "Private purchase data stays on the customer device during proving. Only the proof and minimal public inputs are submitted."],
  ["THREAT MODEL", "The protocol limits onchain disclosure and replay, but does not claim anonymity from an issuer or relayer."],
  ["PROJECT HISTORY", "Verify Trust originally focused on proving that a review came from a real customer. The 2026 protocol rebuild focuses on solving the harder problem: proving that claim without identifying the customer."],
  ["OPEN SOURCE", "Apache-2.0 · github.com/SilviaMogas/verifytrust · documentation paths are linked below."],
  ["REPRODUCIBLE BUILD", "pnpm install · pnpm -r build · pnpm -r test · pnpm --filter web lint · pnpm --filter web build"],
  ["FUNDING IMPACT", "Funding supports privacy-preserving public-good infrastructure, reproducible cryptographic tooling, and accessible verification."],
  ["KNOWN LIMITATIONS", "Demo issuer sees customer secret; review commitment is not bound inside the proof; a relayer could pair a proof with a different commitment, with nullifier consumption as the current mitigation; future improvement binds commitment as a public input; relayer sees submitter IP; no external audit; Sepolia testnet only; timing correlation between issuance and submission."],
];

export default function Octant() {
  const sepolia = deployments[11155111];
  const docs = ["ARCHITECTURE", "PRIVACY_ARCHITECTURE", "CRYPTOGRAPHIC_SPEC", "THREAT_MODEL", "PROJECT_HISTORY", "OCTANT_APPLICATION", "OCTANT_READINESS", "DEMO_SCRIPT"];
  const sepoliaExplorer = "https://sepolia.etherscan.io/address/";
  const milestones = [
    ["2023", "Verify Trust founded around a blockchain-backed Proof of Review protocol (Proof of Review Protocol, Verify Trust Hub prototype, digital-identity concept, Web2.5/Web3 onboarding).", true],
    ["2023", "Selected as Best Idea at the CEIN Awards (Navarra, Spain).", true],
    ["2023", "Selected by ACCIÓ to represent Catalonia at Web Summit Lisbon 2023.", true],
    ["—", "Incubated by The LIST (Luxembourg).", true],
    ["2026", "Protocol rebuild: privacy-preserving ZK architecture (this repository).", false],
  ] as const;
  return <main className="shell"><Nav /><section className="hero"><div className="eyebrow">VERIFY TRUST</div><h1>Privacy-Preserving<br />Proof of Review</h1><p className="accent">PROVE THE PURCHASE. PROTECT THE PERSON.</p><p>Verify Trust originally focused on proving that a review came from a real customer. The 2026 protocol rebuild focuses on solving the harder problem: proving that claim without identifying the customer.</p></section>{sections.map(([heading,body])=><section className="section" id={heading.toLowerCase().replaceAll(" ","-")} key={heading}><h2 className="label">{heading}</h2><p style={{whiteSpace:"pre-line",maxWidth:800}}>{body}</p>{heading==="PROJECT HISTORY"&&<div className="milestones">{milestones.map(([year,milestone,reported])=><div className="milestone" key={milestone}><span className="mono">{year}</span><span>{milestone} {reported&&<small>founder-reported</small>}</span></div>)}</div>}{heading==="LIVE DEMO"&&<Link className="button" href="/demo">OPEN LIVE DEMO</Link>}{heading==="CONTRACTS"&&<div className="contract-list"><p className="mono">Ethereum Sepolia · 11155111</p>{([["HonkVerifier",sepolia.honkVerifier],["ProofOfReviewVerifier",sepolia.proofVerifier],["IssuerRegistry",sepolia.issuerRegistry],["VerifyTrustRegistry",sepolia.verifyTrustRegistry]] as const).map(([name,address])=><a className="contract-row mono" href={`${sepoliaExplorer}${address}`} target="_blank" rel="noreferrer" key={name}><span>{name}</span><span>{address} ↗</span></a>)}</div>}{heading==="OPEN SOURCE"&&<div className="actions">{docs.map(doc=><a key={doc} href={`https://github.com/SilviaMogas/verifytrust/blob/main/docs/${doc}.md`}>{`docs/${doc}.md`}</a>)}</div>}</section>)}<Footer /></main>;
}
