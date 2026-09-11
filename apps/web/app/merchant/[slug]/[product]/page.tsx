import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Nav } from "../../../components";
import { PayButton } from "../../../PayButton";
import { getMerchant, getProduct } from "../../../../lib/catalog";
import { listReviews, reviewStats } from "../../../../lib/reviews";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [
    { slug: "longhand", product: "verified-membership" },
    { slug: "longhand", product: "one-postcard" },
    { slug: "longhand", product: "three-months" },
    { slug: "longhand", product: "postcard-year" },
  ];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productSlug } = await params;
  const merchant = getMerchant(slug);
  const product = getProduct(slug, productSlug);
  if (!merchant || !product) notFound();
  const stats = await reviewStats(product.slug);
  const reviews = await listReviews({
    merchantSlug: merchant.slug,
    productSlug: product.slug,
  });
  return <main className="shell"><Nav /><section className="hero compact-hero"><div className="eyebrow">{product.label || merchant.name}</div><h1>{product.name}</h1><p><Link className="text-link" href={`/merchant/${merchant.slug}`}>{merchant.name}</Link></p><p>{product.description}</p><strong className="price large-price">{product.priceLabel}</strong><div className="actions">{product.slug === "verified-membership" ? <PayButton productSlug={product.slug}>Pay $1 and review</PayButton> : <a className="button" href={merchant.website} target="_blank" rel="noreferrer">View product ↗</a>}</div>{product.slug === "verified-membership" && <p className="muted-small">Checkout opens with the Stripe integration.</p>}</section><section className="section"><div className="rating-summary"><div><span className="eyebrow">VERIFIED RATING</span><strong>{stats.average === null ? "—" : stats.average.toFixed(1)}</strong><span>{stats.count} verified reviews</span></div><div className="rating-bars">{([5, 4, 3, 2, 1] as const).map((rating) => <div key={rating}><span>{rating} ★</span><i><b style={{ width: `${stats.count ? (stats.distribution[rating] / stats.count) * 100 : 0}%` }} /></i><em>{stats.distribution[rating]}</em></div>)}</div></div></section><section className="section"><div className="label">PUBLISHED REVIEWS</div>{reviews.length === 0 ? <div className="empty-state"><h3>No verified reviews yet</h3><p>Be the first Longhand member to complete a real purchase and leave a privacy-protected verified review.</p><PayButton productSlug={product.slug}>Become the first verified reviewer</PayButton></div> : <div className="review-list">{reviews.map((review) => <article className="review-card neon-card" key={review.id}><div className="review-heading"><strong>{"★".repeat(review.rating)}</strong><span>{review.publicIdentity}</span></div><h3>{review.title}</h3><p>{review.body}</p><p className="muted-small">{new Date(review.publishedAt).toLocaleDateString()} · <Link className="text-link" href={`/verify/${review.id}`}>View verification</Link></p></article>)}</div>}</section><section className="section"><div className="grid"><div className="card"><div className="label">VERIFICATION</div><h3>Proof from a real purchase</h3><p>VerifyTrust checks that an eligible purchase was made for this product before a review is published. The verification is recorded on Ethereum without exposing the buyer.</p></div><div className="card"><div className="label">PRIVACY</div><h3>Keep the private details private</h3><p>Your identity, email, payment information and purchase history stay out of the public review record. Only the minimum proof needed to trust the review is shared.</p></div></div></section><Footer /></main>;
}
