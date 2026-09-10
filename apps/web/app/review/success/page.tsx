import Link from "next/link";
import { Footer, Nav } from "../../components";
import { retrieveCheckoutSession, type CheckoutSession } from "../../../lib/stripe";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PaymentNotConfirmed() {
  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero state-page">
        <div className="eyebrow">PAYMENT NOT CONFIRMED</div>
        <h1>Payment not confirmed</h1>
        <p>
          We could not confirm your Longhand membership payment yet. Please
          return to checkout and try again.
        </p>
        <Link className="button" href="/merchant/longhand/verified-membership">
          Retry payment
        </Link>
      </section>
      <Footer />
    </main>
  );
}

function EligibilityUsed() {
  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero state-page">
        <div className="eyebrow">ELIGIBILITY ALREADY USED</div>
        <h1>Eligibility already used</h1>
        <p>
          This payment has already been used to issue a private purchase
          credential.
        </p>
        <Link className="button" href="/merchant/longhand">
          Return to Longhand
        </Link>
      </section>
      <Footer />
    </main>
  );
}

function ConfirmedPayment({ sessionId }: { sessionId: string }) {
  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero state-page">
        <div className="eyebrow">PAYMENT CONFIRMED</div>
        <h1>You are eligible to leave a verified review.</h1>
        <p>
          Your $1 Longhand membership has been confirmed. VerifyTrust can
          prove that you made an eligible purchase without publishing your
          identity, email or payment information.
        </p>
        <div className="privacy-list">
          <span>Your name stays private</span>
          <span>Your email stays private</span>
          <span>Your Stripe payment stays private</span>
          <span>Your purchase history stays private</span>
        </div>
        <div className="public-result">
          <span>Valid Longhand purchase</span>
          <span>Product reviewed</span>
          <span>Rating and review</span>
          <span>Verification status</span>
          <span>Duplicate prevention</span>
        </div>
        <div className="actions">
          <Link
            className="button"
            href={`/review/write?session_id=${encodeURIComponent(sessionId)}`}
          >
            Leave my verified review
          </Link>
          <Link className="button secondary" href="/merchant/longhand">
            Return to Longhand
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = first((await searchParams).session_id);
  if (!sessionId) return <PaymentNotConfirmed />;
  let session: CheckoutSession;
  try {
    session = await retrieveCheckoutSession(sessionId);
  } catch {
    return <PaymentNotConfirmed />;
  }
  const paid =
    session.payment_status === "paid" || session.status === "complete";
  if (!paid) return <PaymentNotConfirmed />;
  if (session.metadata?.credential_issued === "true") {
    return <EligibilityUsed />;
  }
  return <ConfirmedPayment sessionId={sessionId} />;
}
