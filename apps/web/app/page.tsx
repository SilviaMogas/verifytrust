import Image from "next/image";
import Link from "next/link";
import { Footer, Nav } from "./components";
import { merchants, products } from "../lib/catalog";
import { listReviews, marketplaceMetrics } from "../lib/reviews";
import { pilotNote, pilotReviews } from "../lib/history";

export const revalidate = 60;

export default async function Home() {
  const metrics = await marketplaceMetrics();
  const reviews = await listReviews().catch(() => null);
  const membership = products[0];

  return (
    <main className="shell">
      <Nav />
      <section className="hero hero-split">
        <div>
          <div className="eyebrow">PRIVACY-PRESERVING REVIEWS</div>
          <h1 className="hero-title">
            REAL REVIEWS.
            <br />
            REAL TRUST.
          </h1>
          <p>
            VerifyTrust confirms that a review comes from a genuine purchase
            without exposing the person, payment or private data behind it.
          </p>
          <div className="actions">
            <Link className="button" href="/marketplace">
              EXPLORE VERIFIED REVIEWS
            </Link>
            <Link className="button secondary" href="/for-businesses">
              ADD YOUR BUSINESS
            </Link>
          </div>
          <p className="trust-line" style={{ marginTop: 22 }}>
            Purchase verified · Identity protected · Duplicate reviews
            prevented
          </p>
          <div className="metrics">
            <div className="metric">
              <strong>{metrics.merchants}</strong>
              <span>
                {metrics.merchants === 1 ? "live pilot" : "live pilots"}
              </span>
            </div>
            <div className="metric">
              <strong>{metrics.products}</strong>
              <span>listed products</span>
            </div>
            <div className="metric">
              <strong>{metrics.verifiedReviews}</strong>
              <span>verified reviews</span>
            </div>
            <div className="metric">
              <strong>{metrics.preventedDuplicates ?? "—"}</strong>
              <span>duplicate attempts prevented</span>
            </div>
          </div>
          <p className="muted-small">
            Verified review count source: {metrics.metricsSource}
          </p>
        </div>
        <div className="hero-feature">
          <div className="eyebrow">FIRST LIVE INTEGRATION</div>
          <h2>Longhand</h2>
          <p className="large-copy">
            A real postcard, and the private story behind it.
          </p>
          <p>
            Longhand is the first merchant using VerifyTrust to connect a real
            Stripe purchase with a privacy-preserving product review.
          </p>
          <div className="badges compact">
            <span>Live pilot</span>
            <span>Real payment</span>
            <span>Verified reviews</span>
            <span>Privacy protected</span>
          </div>
          <div className="actions">
            <Link className="button" href="/merchant/longhand">
              VIEW LONGHAND REVIEWS
            </Link>
            <a
              className="button secondary"
              href="https://longhand.cards"
              target="_blank"
              rel="noreferrer"
            >
              VISIT LONGHAND.CARDS ↗
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <div className="label">LATEST VERIFIED REVIEWS</div>
            <h2>EXPLORE THE LATEST REVIEWS</h2>
          </div>
        </div>
        {reviews === null ? (
          <div className="empty-state">
            <h3>Reviews temporarily unavailable</h3>
            <p>
              The review store could not be reached. On-chain verifications
              are unaffected; try again shortly.
            </p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <h3>No verified reviews yet</h3>
            <p>
              Be the first Longhand member to complete a real purchase and
              leave a privacy-protected verified review.
            </p>
            <Link
              className="button"
              href="/merchant/longhand/verified-membership"
            >
              BECOME THE FIRST VERIFIED REVIEWER
            </Link>
          </div>
        ) : (
          <div className="review-grid">
            {reviews.slice(0, 6).map((review) => (
              <article className="review-card neon-card" key={review.id}>
                <div className="review-heading">
                  <strong>{"★".repeat(review.rating)}</strong>
                  <span>{review.publicIdentity}</span>
                </div>
                <h3>{review.title}</h3>
                <p className="review-body-clamp">{review.body}</p>
                <p className="muted-small review-footer">
                  Verified purchase ·{" "}
                  {new Date(review.publishedAt).toLocaleDateString()} ·{" "}
                  <Link className="text-link" href={`/verify/${review.id}`}>
                    View verification
                  </Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="featured-product">
          <div>
            <div className="eyebrow">LONGHAND · LIVE VERIFICATION PRODUCT</div>
            <h2>{membership.name}</h2>
            <p>
              Join the first live VerifyTrust merchant experience. Complete a
              real $1 payment and leave one verified review without making your
              identity or payment details public.
            </p>
          </div>
          <div>
            <strong className="price">Price: {membership.priceLabel}</strong>
            <Link
              className="button"
              href="/merchant/longhand/verified-membership"
            >
              JOIN AND REVIEW FOR $1
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="label">HOW IT WORKS</div>
        <div className="how-strip">
          {[
            "Buy",
            "Receive a private credential",
            "Prove eligibility on your device",
            "Publish a verified review",
          ].map((step, index) => (
            <div key={step}>
              <span>0{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <div className="label">EARLY PILOT · 2023–2024 · PRE-ZK</div>
            <h2>OUR HISTORY</h2>
          </div>
        </div>
        <p>{pilotNote}</p>
        <div className="pilot-row">
          {pilotReviews.map((review) => (
            <article className="pilot-card" key={review.src}>
              <Image
                src={review.src}
                alt={review.alt}
                width={320}
                height={320}
              />
              <span>{review.brand} · Early pilot</span>
              <div className="badge-muted">Not ZK-verified</div>
            </article>
          ))}
        </div>
        <Link className="text-link" href="/octant#history">
          Read the project history
        </Link>
      </section>

      <section className="section">
        <div className="label">DISCOVER MORE BRANDS</div>
        <div className="brand-grid">
          <div className="card">
            <h3>{merchants[0].name}</h3>
            <p>{merchants[0].category}</p>
            <span className="live-tag">Live pilot</span>
            <div className="actions">
              <Link className="button" href="/merchant/longhand">
                VIEW BRAND
              </Link>
            </div>
          </div>
          <div className="coming-soon-card">More integrations coming soon</div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
