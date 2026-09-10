import Image from "next/image";
import Link from "next/link";
import type { Product } from "../lib/catalog";

export function Nav() {
  return <nav className="nav"><Link href="/" aria-label="VerifyTrust home"><Image src="/verifytrust-logo.png" alt="Verify Trust" width={154} height={36} priority /></Link><div className="navlinks"><Link href="/marketplace">Marketplace</Link><Link href="/for-businesses">For Businesses</Link><Link href="/how-it-works">How It Works</Link><Link href="/privacy">Privacy</Link><Link href="/demo">Technical Demo</Link><Link className="button nav-cta" href="/for-businesses">Add your business</Link></div></nav>;
}

export function Footer() {
  return <footer className="footer"><span>VERIFY TRUST · APACHE-2.0</span><div className="footer-links"><Link href="/octant">OCTANT</Link><a href="https://github.com/SilviaMogas/verifytrust">GITHUB ↗</a></div></footer>;
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

export function ProductCard({
  product,
  merchantName = "Longhand",
  reviewCount,
}: {
  product: Product;
  merchantName?: string;
  reviewCount?: number;
}) {
  return <article className="product-card">
    <div className="product-card-top"><div className="eyebrow">{product.label || merchantName}</div>{product.live && <span className="live-tag">LIVE</span>}</div>
    <Link href={`/merchant/${product.merchantSlug}/${product.slug}`}><h3>{product.name}</h3></Link>
    <p>{product.description}</p>
    <div className="product-card-meta"><strong className="price">{product.priceLabel}</strong>{reviewCount !== undefined && <span className="muted-small">{reviewCount} verified reviews</span>}</div>
    {product.badges.length > 0 && <div className="badges compact">{product.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>}
    <Link className="button" href={`/merchant/${product.merchantSlug}/${product.slug}`}>{product.cta}</Link>
  </article>;
}
