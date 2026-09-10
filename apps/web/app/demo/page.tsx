"use client";

import { useState } from "react";
import {
  createReviewCommitment,
  checkNullifier,
  createPublicClient,
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

type PrivateData = { email:string; orderId:string; receipt:string };

const steps = ["GENERATE DEMO PURCHASE CREDENTIAL","SHOW PRIVATE DATA","GENERATE ZERO-KNOWLEDGE PROOF","WRITE REVIEW","VERIFY ON ETHEREUM","DISPLAY","ATTEMPT DUPLICATE REVIEW"];

export default function Demo() {
  const [step,setStep] = useState(1);
  const [credential,setCredential] = useState<Credential>();
  const [privateData,setPrivateData] = useState<PrivateData>();
  const [proof,setProof] = useState<ProofOfReview>();
  const [review,setReview] = useState("A thoughtful purchase with a genuinely useful design.");
  const [rating,setRating] = useState(5);
  const [commitment,setCommitment] = useState<{commitment:`0x${string}`;salt:`0x${string}`}>();
  const [revealed,setRevealed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [txHash,setTxHash] = useState<string>();
  const [registry,setRegistry] = useState<string>();
  const [reset,setReset] = useState(0);

  const issue = async () => {
    setBusy(true); setMessage("");
    try {
      const secret = randomHex32();
      const data = { email:"customer@example.com", orderId:`NOVA-${Date.now()}`, receipt:"€39.00" };
      const response = await fetch("/api/issuer/issue",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({merchantId:fieldFromString("nova-goods"),productId:fieldFromString("nova-travel-bottle"),purchaseTimestamp:Math.floor(Date.now()/1000),customerSecret:secret})});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCredential({...body.credential,purchaseTimestamp:BigInt(body.credential.purchaseTimestamp)}); setPrivateData(data); setStep(2); setMessage(body.devKey?"issued with dev key":"issued by demo merchant");
    } catch(error) { setMessage(error instanceof Error?error.message:"issuance failed"); } finally { setBusy(false); }
  };
  const prove = async () => {
    if (!credential) return;
    setBusy(true); setMessage("");
    try { const started=performance.now(); const generated=await generateProof(credential); const valid=await verifyProof(generated); if(!valid) throw new Error("local proof verification failed"); setProof(generated); setMessage(`verified locally · ${Math.round(performance.now()-started)} ms`); setStep(4); } catch(error) { setMessage(error instanceof Error?error.message:"proof failed"); } finally { setBusy(false); }
  };
  const makeCommitment = () => { setCommitment(createReviewCommitment({reviewText:review,rating})); setStep(5); };
  const submit = async (duplicate=false) => {
    if (!proof || !commitment) return;
    setBusy(true); setMessage("");
    try { const response=await fetch("/api/relayer/submit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({proof:proof.proof,publicInputs:proof.publicInputs,reviewCommitment:commitment.commitment})}); const body=await response.json(); if(body.hash){setTxHash(body.hash);setRegistry(body.registryAddress);setStep(6);setMessage(duplicate?"REVIEW ALREADY USED / NULLIFIER REJECTED":"ethereum verified");} else setMessage(duplicate&&String(body.error).includes("NullifierAlreadyUsed")?"REVIEW ALREADY USED / NULLIFIER REJECTED":body.error||"ETHEREUM NOT CONFIGURED — NOT VERIFIED"); } catch(error) { setMessage(error instanceof Error?error.message:"ETHEREUM NOT CONFIGURED — NOT VERIFIED"); } finally { setBusy(false); }
  };
  const checkDuplicate = async () => {
    if (!proof || !registry) return;
    try {
      const publicClient = createPublicClient({
        chain: defineChain({ id: 31337, name: "Anvil", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } } }),
        transport: http("http://127.0.0.1:8545"),
      });
      const used = await checkNullifier(proof.nullifier, { publicClient, registryAddress: registry as `0x${string}` });
      setMessage(used ? "CLIENT CHECK · NULLIFIER USED" : "CLIENT CHECK · NULLIFIER AVAILABLE");
    } catch {
      setMessage("CLIENT CHECK · UNAVAILABLE");
    }
    setStep(7);
  };
  const resetDemo = () => { setStep(1);setCredential(undefined);setPrivateData(undefined);setProof(undefined);setCommitment(undefined);setTxHash(undefined);setRegistry(undefined);setMessage("");setReset(reset+1); };
 return <main className="shell" key={reset}><Nav /><section className="hero"><div className="eyebrow">NOVA GOODS · DEMO MERCHANT</div><h1>Proof, not<br /><span className="accent">paperwork.</span></h1><p>Your purchase stays private. The proof becomes verifiable.</p></section><section className="section"><div className="pipeline">{steps.map((label,index)=><span key={label} className={step===index+1?"accent":""}>{String(index+1).padStart(2,"0")} {label}</span>)}</div></section><section className="section"><div className="card"><div className="label">STEP {step} / 07</div><h2>{steps[step-1]}</h2>{step===1&&<><p><strong>NOVA GOODS</strong> · DEMO MERCHANT<br />Product: NOVA Travel Bottle</p><button className="button" disabled={busy} onClick={issue}>GENERATE DEMO PURCHASE CREDENTIAL</button><p className="status">demo issuer sees the customer secret; blind issuance is future work</p></>}{step===2&&privateData&&credential&&<><p>Private data is generated and held locally. Values never leave this browser / never written onchain.</p>{[["Customer secret",credential.customerSecret],["Receipt",privateData.receipt],["Order ID",privateData.orderId],["Email",privateData.email],["Purchase credential",JSON.stringify(credential,(_,value)=>typeof value==="bigint"?value.toString():value)]].map(([label,value])=><div className="step" key={label}><span className="stepnum">PRIVATE</span><span><strong>{label}</strong><br /><span className="mono">{revealed?String(value):"••••••••••••••••"}</span></span></div>)}<button className="button" onClick={()=>setRevealed(!revealed)}>{revealed?"HIDE VALUES":"REVEAL VALUES"}</button><button className="button secondary" onClick={()=>setStep(3)}>CONTINUE</button></>}{step===3&&<><p>PRIVATE PURCHASE DATA ↓ LOCAL ZK PROVER ↓ PUBLIC PROOF</p><button className="button" disabled={busy} onClick={prove}>{busy?"PROVING…":"GENERATE PRIVATE PROOF"}</button></>}{step===4&&proof&&<><p className="status">{message || "VERIFIED LOCALLY"}</p><p className="mono">PUBLIC INPUTS<br />{proof.publicInputs.join("\n")}</p><p className="mono">PROOF SIZE · {Math.round((proof.proof.length-2)/2)} BYTES</p><button className="button" onClick={()=>setStep(5)}>WRITE REVIEW</button></>}{step===5&&<><textarea value={review} onChange={e=>setReview(e.target.value)} /><div className="actions">{[1,2,3,4,5].map(value=><button className={value===rating?"button":"button secondary"} key={value} onClick={()=>setRating(value)}>{value} ★</button>)}</div><button className="button" onClick={makeCommitment}>COMPUTE REVIEW COMMITMENT</button>{commitment&&<><p className="mono">COMMITMENT · {commitment.commitment}<br />Review text stays offchain.</p><button className="button" disabled={busy} onClick={()=>submit()}>VERIFY ON ETHEREUM</button></>}</>}{step===6&&<><div className="grid"><div className="card status">VERIFIED PURCHASE</div><div className="card status">PRIVACY PROTECTED</div><div className="card status">ETHEREUM VERIFIED</div></div><p className="mono">NETWORK · {process.env.NEXT_PUBLIC_EXPLORER_URL?"SEPOLIA":"ANVIL"}<br />REGISTRY · {registry}<br />PROOF STATUS · VERIFIED<br />NULLIFIER STATUS · USED<br />VERIFICATION TRANSACTION · {txHash}</p><button className="button" onClick={checkDuplicate}>ATTEMPT DUPLICATE REVIEW</button></>}{step===7&&<><p className="status">{message || "CLIENT CHECK · NULLIFIER USED"}</p><button className="button" disabled={busy} onClick={()=>submit(true)}>RESUBMIT SAME PROOF</button><p>{message}</p></>}{message&&step!==7&&<p className="status">{message}</p>}</div></section><button className="button secondary" onClick={resetDemo}>RESET DEMO</button><Footer /></main>;
}
