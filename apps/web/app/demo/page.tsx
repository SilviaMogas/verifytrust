"use client";

import { useState } from "react";
import {
  checkNullifier,
  createPublicClient,
  createReviewCommitment,
  defineChain,
  fieldFromString,
  generateProof,
  http,
  randomHex32,
  verifyProof,
  type Credential,
  type ProofOfReview,
} from "@verifytrust/sdk";
import { Footer, Nav } from "../components";

type PrivateData = { email: string; orderId: string; receipt: string };
type ChainInfo = { chainId: number; network: string; explorerUrl?: string; registryAddress?: `0x${string}` };
const steps = ["GENERATE DEMO PURCHASE CREDENTIAL", "SHOW PRIVATE DATA", "GENERATE ZERO-KNOWLEDGE PROOF", "WRITE REVIEW", "VERIFY ON ETHEREUM", "DISPLAY", "ATTEMPT DUPLICATE REVIEW"];
const publicInputLabels = ["merchantId", "productId", "issuerKeyHash", "nullifier", "protocolVersion"];

export default function Demo() {
  const [step, setStep] = useState(1);
  const [credential, setCredential] = useState<Credential>();
  const [privateData, setPrivateData] = useState<PrivateData>();
  const [proof, setProof] = useState<ProofOfReview>();
  const [review, setReview] = useState("A thoughtful purchase with a genuinely useful design.");
  const [rating, setRating] = useState(5);
  const [commitment, setCommitment] = useState<{ commitment: `0x${string}`; salt: `0x${string}` }>();
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [proofMs, setProofMs] = useState<number>();
  const [chainInfo, setChainInfo] = useState<ChainInfo>();
  const [txHash, setTxHash] = useState<string>();
  const [nullifierUsed, setNullifierUsed] = useState<boolean>();
  const [duplicateAttempted, setDuplicateAttempted] = useState(false);
  const [duplicateReason, setDuplicateReason] = useState("");
  const [reset, setReset] = useState(0);

  const issue = async () => {
    setBusy(true); setMessage("");
    try {
      const secret = randomHex32();
      const data = { email: "customer@example.com", orderId: `NOVA-${Date.now()}`, receipt: "€39.00" };
      const response = await fetch("/api/issuer/issue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ merchantId: fieldFromString("nova-goods"), productId: fieldFromString("nova-travel-bottle"), purchaseTimestamp: Math.floor(Date.now() / 1000), customerSecret: secret }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCredential({ ...body.credential, purchaseTimestamp: BigInt(body.credential.purchaseTimestamp) });
      setPrivateData(data); setStep(2); setMessage(body.devKey ? "issued with dev key" : "issued by demo merchant");
    } catch (error) { setMessage(error instanceof Error ? error.message : "issuance failed"); } finally { setBusy(false); }
  };

  const prove = async () => {
    if (!credential) return;
    setBusy(true); setMessage("proving in your browser…");
    const started = performance.now();
    try {
      const generated = await generateProof(credential);
      if (!await verifyProof(generated)) throw new Error("local proof verification failed");
      setProof(generated); setProofMs(Math.round(performance.now() - started)); setMessage("verified locally");
    } catch (error) { setMessage(error instanceof Error ? error.message : "proof failed"); } finally { setBusy(false); }
  };

  const makeCommitment = () => { setCommitment(createReviewCommitment({ reviewText: review, rating })); setStep(5); };

  const submit = async (duplicate = false) => {
    if (!proof || !commitment) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/relayer/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proof: proof.proof, publicInputs: proof.publicInputs, reviewCommitment: commitment.commitment }) });
      const body = await response.json();
      if (!response.ok || !body.hash) {
        if (duplicate && body.errorName === "NullifierAlreadyUsed") { setDuplicateAttempted(true); setDuplicateReason("NullifierAlreadyUsed"); setMessage("NULLIFIER REJECTED"); }
        else setMessage(body.error || "ETHEREUM NOT CONFIGURED — NOT VERIFIED");
        return;
      }
      setTxHash(body.hash); setChainInfo({ chainId: body.chainId, network: body.network, explorerUrl: body.explorerUrl, registryAddress: body.registryAddress }); setStep(6); setMessage("ethereum verified");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ETHEREUM NOT CONFIGURED — NOT VERIFIED"); } finally { setBusy(false); }
  };

  const checkDuplicate = async () => {
    if (!proof || !chainInfo?.registryAddress) return;
    try {
      const chain = chainInfo.chainId === 11155111
        ? defineChain({ id: 11155111, name: "Ethereum Sepolia", nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 }, rpcUrls: { default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] } } })
        : defineChain({ id: 31337, name: "Local Anvil (dev)", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } } });
      const publicClient = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });
      setNullifierUsed(await checkNullifier(proof.nullifier, { publicClient, registryAddress: chainInfo.registryAddress }));
    } catch { setNullifierUsed(undefined); }
    setStep(7);
  };

  const resetDemo = () => { setStep(1); setCredential(undefined); setPrivateData(undefined); setProof(undefined); setCommitment(undefined); setChainInfo(undefined); setTxHash(undefined); setNullifierUsed(undefined); setDuplicateAttempted(false); setDuplicateReason(""); setMessage(""); setReset(reset + 1); };

  return <main className="shell" key={reset}>
    <Nav />
    <section className="hero"><div className="eyebrow">NOVA GOODS · DEMO MERCHANT</div><h1>PROVE THE PURCHASE.<br /><span className="accent">PROTECT THE PERSON.</span></h1><p>Your purchase stays private. The proof becomes verifiable.</p></section>
    <section className="section"><div className="pipeline">{steps.map((label, index) => <span key={label} className={step === index + 1 ? "accent" : ""}>{String(index + 1).padStart(2, "0")} {label}</span>)}</div></section>
    <section className="section"><div className="card">
      <div className="label">STEP {step} / 07</div><h2>{steps[step - 1]}</h2>
      {step === 1 && <><p><strong>NOVA GOODS</strong> · DEMO MERCHANT<br />Product: NOVA Travel Bottle</p><button className="button" disabled={busy} onClick={issue}>GENERATE DEMO PURCHASE CREDENTIAL</button><p className="status">demo issuer sees the customer secret; blind issuance is future work</p></>}
      {step === 2 && privateData && credential && <><p>Private data is generated and held locally. Values never leave this browser / never written onchain.</p>{[["Customer secret", credential.customerSecret], ["Receipt", privateData.receipt], ["Order ID", privateData.orderId], ["Email", privateData.email], ["Purchase credential", JSON.stringify(credential, (_, value) => typeof value === "bigint" ? value.toString() : value)]].map(([label, value]) => <div className="step" key={label}><span className="stepnum">PRIVATE</span><span><strong>{label}</strong><br /><span className="mono">{revealed ? String(value) : "••••••••••••••••"}</span></span></div>)}<button className="button" onClick={() => setRevealed(!revealed)}>{revealed ? "HIDE VALUES" : "REVEAL VALUES"}</button><button className="button secondary" onClick={() => setStep(3)}>CONTINUE</button></>}
      {step === 3 && !proof && <><div className="proof-pipeline"><span className={busy ? "active" : ""}>PRIVATE PURCHASE DATA</span><b>↓</b><span className={busy ? "active" : ""}>LOCAL ZK PROVER</span><b>↓</b><span>PUBLIC PROOF</span></div><button className="button" disabled={busy} onClick={prove}>{busy ? "PROVING…" : "GENERATE PRIVATE PROOF"}</button></>}
      {step === 3 && proof && <><div className="proof-pipeline"><span>PRIVATE PURCHASE DATA</span><b>↓</b><span>LOCAL ZK PROVER</span><b>↓</b><span className="active">PUBLIC PROOF</span></div><p className="status">{message || "VERIFIED LOCALLY"}{proofMs ? ` · ${proofMs} ms` : ""}</p><div className="public-inputs">{proof.publicInputs.map((value, index) => <div key={publicInputLabels[index]}><span>{publicInputLabels[index]}</span><code>{value}</code></div>)}</div><p className="mono">PROOF SIZE · {Math.round((proof.proof.length - 2) / 2)} BYTES</p><button className="button" onClick={() => setStep(4)}>WRITE REVIEW</button></>}
      {step === 4 && <><textarea value={review} onChange={event => setReview(event.target.value)} /><div className="actions">{[1, 2, 3, 4, 5].map(value => <button className={value === rating ? "button" : "button secondary"} key={value} onClick={() => setRating(value)}>{value} ★</button>)}</div><button className="button" onClick={makeCommitment}>COMPUTE REVIEW COMMITMENT</button></>}
      {step === 5 && commitment && <><p className="mono">COMMITMENT · {commitment.commitment}<br />Review text stays offchain.</p><button className="button" disabled={busy} onClick={() => submit()}>VERIFY ON ETHEREUM</button></>}
      {step === 6 && <><div className="badges"><span>VERIFIED PURCHASE</span><span>PRIVACY PROTECTED</span><span>ETHEREUM VERIFIED</span></div><div className="details"><div>NETWORK<strong>{chainInfo?.network}</strong></div><div>CONTRACT ADDRESS<strong className="mono">{chainInfo?.registryAddress}</strong></div><div>PROOF STATUS<strong>VERIFIED</strong></div><div>NULLIFIER STATUS<strong>USED</strong></div><div>VERIFICATION TRANSACTION<strong className="mono">{chainInfo?.explorerUrl ? <a href={`${chainInfo.explorerUrl}/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash} ↗</a> : txHash}</strong></div></div><button className="button" onClick={checkDuplicate}>ATTEMPT DUPLICATE REVIEW</button></>}
      {step === 7 && <><div className="duplicate-card"><strong>REVIEW ALREADY USED</strong><strong>NULLIFIER REJECTED</strong><span className="mono">{proof?.nullifier}</span><span>{duplicateReason || "Click RESUBMIT SAME PROOF to confirm the onchain revert."}</span></div><p className="status">nullifier already used onchain: {nullifierUsed === undefined ? "checking…" : String(nullifierUsed)}</p><button className="button" disabled={busy} onClick={() => submit(true)}>RESUBMIT SAME PROOF</button>{duplicateAttempted && <p className="status">{message}</p>}</>}
      {message && step !== 7 && <p className="status">{message}</p>}
    </div></section>
    <button className="button secondary" onClick={resetDemo}>RESET DEMO</button><Footer />
  </main>;
}
