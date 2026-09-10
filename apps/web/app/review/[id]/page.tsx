import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Nav } from "../../components";
import { getReview } from "../../../lib/store";
import { getProduct } from "../../../lib/catalog";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string | string[] }>;
};

export default async function ReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const { id } = await params;
  const review = await getReview(id);
  if (!review) notFound();
  const product = getProduct(review.merchantSlug, review.productSlug);
  if (!product) notFound();
  const justValue = (await searchParams).just;
  const just = justValue === "1" || (Array.isArray(justValue) && justValue.includes("1"));
  return (
    <main className="shell">
      <Nav />
      {just && (
        <section className="hero compact-hero">
          <div className="eyebrow">PUBLISHED REVIEW</div>
          <h1>Your review is verified.</h1>
          <p>
            The review is now connected to proof of a valid Longhand purchase.
            Your private purchase data was not published.
          </p>
        </section>
      )}
      <section className="section published-review-page">
        {!just && (
          <div className="section-heading">
            <div>
              <div className="eyebrow">PUBLISHED REVIEW</div>
              <h1>Your review is verified.</h1>
              <p>
                The review is now connected to proof of a valid Longhand
                purchase. Your private purchase data was not published.
              </p>
            </div>
          </div>
        )}
        <article className="review-card published-review">
          <div className="review-heading">
            <strong>{"★".repeat(review.rating)}</strong>
            <span>{review.publicIdentity}</span>
          </div>
          <h2>{review.title}</h2>
          <p>{review.body}</p>
          <p className="muted-small">
            {product.name} · {new Date(review.publishedAt).toLocaleDateString()}
          </p>
        </article>
        <div className="badges">
          <span>Verified Purchase</span>
          <span>Privacy Protected</span>
          <span>Duplicate Protected</span>
          {review.txHash && <span>Ethereum Verified</span>}
        </div>
        <div className="actions">
          <Link className="button" href={`/review/${review.id}`}>
            View public review
          </Link>
          <Link className="button secondary" href={`/verify/${review.id}`}>
            View verification
          </Link>
          <Link className="button secondary" href="/merchant/longhand">
            Return to Longhand
          </Link>
          <Link className="button secondary" href="/marketplace">
            Explore marketplace
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
