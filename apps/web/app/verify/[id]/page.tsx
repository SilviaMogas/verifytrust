import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Nav } from "../../components";
import { CopyButton } from "../../CopyButton";
import { getReview } from "../../../lib/store";
import { getMerchant, getProduct } from "../../../lib/catalog";

type VerificationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VerificationPage({
  params,
}: VerificationPageProps) {
  const { id } = await params;
  const review = await getReview(id);
  if (!review) notFound();
  const merchant = getMerchant(review.merchantSlug);
  const product = getProduct(review.merchantSlug, review.productSlug);
  if (!merchant || !product) notFound();
  const explorerBase =
    review.network === "Ethereum Sepolia"
      ? process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.etherscan.io"
      : undefined;
  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero">
        <div className="eyebrow">VERIFIED</div>
        <h1>This review came from an eligible Longhand customer.</h1>
        <p>
          VerifyTrust confirmed that a valid purchase credential was used for
          this review. The proof does not reveal the buyer’s identity or
          payment information.
        </p>
      </section>
      <section className="section">
        <div className="verification-details">
          <div>
            <span>Merchant</span>
            <strong>{merchant.name}</strong>
          </div>
          <div>
            <span>Product</span>
            <strong>{product.name}</strong>
          </div>
          <div>
            <span>Review commitment</span>
            <strong className="mono">{review.reviewCommitment}</strong>
            <CopyButton value={review.reviewCommitment} />
          </div>
          <div>
            <span>Network</span>
            <strong>{review.network}</strong>
          </div>
          <div>
            <span>Contract</span>
            <strong className="mono">{review.contractAddress}</strong>
            <CopyButton value={review.contractAddress} />
          </div>
          <div>
            <span>Transaction</span>
            <strong className="mono">
              {review.txHash ? (
                explorerBase ? (
                  <a
                    className="text-link"
                    href={`${explorerBase}/tx/${review.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {review.txHash}
                  </a>
                ) : (
                  review.txHash
                )
              ) : (
                "—"
              )}
            </strong>
            {review.txHash && <CopyButton value={review.txHash} />}
          </div>
          <div>
            <span>Verification time</span>
            <strong>{new Date(review.publishedAt).toLocaleString()}</strong>
          </div>
          <div>
            <span>Nullifier status</span>
            <strong>Used — duplicate reviews blocked</strong>
          </div>
          <div>
            <span>Nullifier</span>
            <strong className="mono">{review.nullifier}</strong>
            <CopyButton value={review.nullifier} />
          </div>
        </div>
      </section>
      <section className="section">
        <div className="card">
          <div className="label">PRIVATE BY DESIGN</div>
          <p>
            The reviewer’s name, email, postal address, Stripe identifiers,
            receipt and purchase history were not published.
          </p>
        </div>
        <Link className="button secondary" href={`/review/${review.id}`}>
          View public review
        </Link>
      </section>
      <Footer />
    </main>
  );
}
