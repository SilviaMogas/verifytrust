import Link from "next/link";
import { Footer, Nav } from "../../components";

export default function CancelledPage() {
  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero state-page">
        <div className="eyebrow">PAYMENT CANCELLED</div>
        <h1>Payment cancelled</h1>
        <p>
          Nothing was charged. You can return to Longhand and try the $1
          membership checkout again whenever you are ready.
        </p>
        <Link className="button" href="/merchant/longhand/verified-membership">
          Return to Longhand
        </Link>
      </section>
      <Footer />
    </main>
  );
}
