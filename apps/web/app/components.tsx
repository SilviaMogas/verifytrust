import Image from "next/image";
import Link from "next/link";

export function Nav() {
  return <nav className="nav"><Link href="/"><Image src="/verifytrust-logo.png" alt="Verify Trust" width={154} height={36} priority /></Link><div className="navlinks"><Link href="/demo">Demo</Link><Link href="/privacy">Privacy</Link><Link href="/octant">Octant</Link></div></nav>;
}

export function Footer() {
  return <footer className="footer"><span>VERIFY TRUST · APACHE-2.0</span><a href="https://github.com/SilviaMogas/verifytrust">GITHUB ↗</a></footer>;
}

export const comparisonRows = [
  ["Email", "EXPOSED", "PRIVATE"],
  ["Order ID", "EXPOSED", "PRIVATE"],
  ["Receipt", "EXPOSED", "PRIVATE"],
  ["Identity", "LINKED", "PRIVATE"],
  ["Purchase eligibility", "—", "PROVEN"],
  ["Purchase history", "POTENTIALLY LINKABLE", "—"],
  ["Duplicate prevention", "—", "PROVEN"],
  ["Verification", "—", "ETHEREUM-BACKED"],
];

export function Comparison() {
  return <table className="compare"><thead><tr><th>Claim</th><th>Traditional</th><th>Verify Trust</th></tr></thead><tbody>{comparisonRows.map(([label, traditional, verify]) => <tr key={label}><td>{label}</td><td>{traditional}</td><td className={verify === "PRIVATE" || verify === "PROVEN" ? "status" : ""}>{verify}</td></tr>)}</tbody></table>;
}
