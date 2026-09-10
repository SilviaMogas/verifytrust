import Link from "next/link";
import { Footer, Nav } from "../components";

const steps = [
  ["01", "Buy", "Complete a purchase with a participating merchant."],
  ["02", "Receive a private credential", "The merchant gives your device a private eligibility credential."],
  ["03", "Prove locally", "Your device checks eligibility without sending your private purchase details away."],
  ["04", "Publish a verified review", "Share your review and the minimum proof needed to trust it."],
  ["05", "Prevent duplicate submissions", "The same eligible purchase cannot be used to publish the same review twice."],
];

export default function HowItWorks() {
  return <main className="shell"><Nav /><section className="hero"><div className="eyebrow">HOW IT WORKS</div><h1>Trust the experience.<br /><span className="accent">Not the dossier.</span></h1><p>VerifyTrust helps customers prove they were eligible to review a product without publishing who they are or what they paid.</p></section><section className="section"><div className="how-steps">{steps.map(([number, title, copy]) => <article key={number}><span className="eyebrow">{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</div></section><section className="section"><div className="label">UNDER THE HOOD</div><h2>A simple customer experience, backed by careful infrastructure.</h2><p>Private credentials and local proof generation keep the underlying purchase details out of the public review record.</p><div className="actions"><Link className="button" href="/demo">OPEN TECHNICAL DEMO</Link><Link className="button secondary" href="/privacy">READ THE PRIVACY MODEL</Link><a className="button secondary" href="https://github.com/SilviaMogas/verifytrust/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noreferrer">READ THE DOCS ↗</a></div></section><Footer /></main>;
}
