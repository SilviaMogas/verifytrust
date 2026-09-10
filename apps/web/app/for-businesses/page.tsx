import Link from "next/link";
import { Footer, Nav } from "../components";

const steps = [
  "Connect purchase confirmation",
  "Issue private eligibility credentials",
  "Let customers prove locally",
  "Publish verified product reviews",
  "Prevent duplicate submissions",
];
const sources = [
  "Stripe purchases",
  "Subscription status",
  "Order fulfilment",
  "Ticket ownership",
  "Membership access",
  "Private product codes",
];

export default function ForBusinesses() {
  return <main className="shell"><Nav /><section className="hero"><div className="eyebrow">FOR BUSINESSES</div><h1>Verified reviews<br /><span className="accent">without building a surveillance system.</span></h1><p>VerifyTrust allows businesses to prove that reviewers were eligible customers while keeping personal and payment information outside the public review record.</p><Link className="button" href="https://github.com/SilviaMogas/verifytrust/issues/new" target="_blank">APPLY TO BECOME AN INTEGRATED MERCHANT ↗</Link></section><section className="section"><div className="label">INTEGRATION STEPS</div><div className="numbered-list">{steps.map((step, index) => <div key={step}><span>0{index + 1}</span><strong>{step}</strong></div>)}</div></section><section className="section"><div className="label">SUPPORTED VERIFICATION SOURCES</div><div className="source-list">{sources.map((source) => <span key={source}>{source}</span>)}</div></section><section className="section"><div className="label">FIRST IMPLEMENTATION EXAMPLE</div><Link className="business-card" href="/merchant/longhand"><div><span className="eyebrow">LIVE PILOT</span><h2>Longhand</h2><p>A real postcard, and the private story behind it.</p></div><span className="text-link">View merchant ↗</span></Link></section><Footer /></main>;
}
