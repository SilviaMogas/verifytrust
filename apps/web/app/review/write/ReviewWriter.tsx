"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateProof,
  randomHex32,
  verifyProof,
  createReviewCommitment,
  type Credential,
  type ProofOfReview,
} from "@verifytrust/sdk";
import { Footer, Nav } from "../../components";

const errorCopy: Record<string, string> = {
  payment_not_confirmed: "Payment not confirmed.",
  eligibility_expired: "Your eligibility token has expired.",
  eligibility_already_used: "Eligibility already used.",
  invalid_eligibility: "Invalid eligibility token.",
  credential_issuance_failed: "Credential issuance failed.",
  local_proof_failed: "Local proof failed. Please try again.",
  ethereum_unavailable: "Ethereum is unavailable right now.",
  relayer_unavailable: "The verification service is temporarily unavailable.",
  duplicate_review: "This purchase has already been used for a verified review.",
  review_publication_failed: "Review publication failed. Please try again.",
};

type Stage = "idle" | "issuing" | "proving" | "verified" | "publishing";

export default function ReviewWriter({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [identityType, setIdentityType] = useState("Anonymous");
  const [firstName, setFirstName] = useState("");
  const [customIdentity, setCustomIdentity] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [proof, setProof] = useState<ProofOfReview>();
  const [error, setError] = useState("");

  const publicIdentity =
    identityType === "Custom alias"
      ? customIdentity
      : identityType === "First name only"
        ? firstName
        : "Anonymous";

  const generatePrivateProof = async () => {
    if (!sessionId) {
      setError("Payment not confirmed.");
      return;
    }
    setError("");
    setStage("issuing");
    try {
      const customerSecret = randomHex32();
      const issueResponse = await fetch("/api/eligibility/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, customerSecret }),
      });
      const issueBody = (await issueResponse.json()) as {
        credential?: Omit<Credential, "purchaseTimestamp"> & {
          purchaseTimestamp: string;
        };
        code?: string;
      };
      if (!issueResponse.ok || !issueBody.credential) {
        throw new Error(
          errorCopy[issueBody.code ?? "credential_issuance_failed"] ??
            "Credential issuance failed.",
        );
      }
      const credential: Credential = {
        ...issueBody.credential,
        purchaseTimestamp: BigInt(issueBody.credential.purchaseTimestamp),
      };
      setStage("proving");
      const generated = await generateProof(credential);
      if (!(await verifyProof(generated))) {
        throw new Error("Local proof failed. Please try again.");
      }
      setProof(generated);
      setStage("verified");
    } catch (caught) {
      setStage("idle");
      setError(caught instanceof Error ? caught.message : "Local proof failed. Please try again.");
    }
  };

  const publish = async () => {
    if (!proof) return;
    setError("");
    setStage("publishing");
    try {
      const { commitment, salt } = createReviewCommitment({
        reviewText: JSON.stringify({ title, body, publicIdentity }),
        rating,
      });
      const response = await fetch("/api/reviews/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proof: proof.proof,
          publicInputs: proof.publicInputs,
          reviewCommitment: commitment,
          salt,
          rating,
          title,
          body,
          publicIdentity,
        }),
      });
      const result = (await response.json()) as { id?: string; code?: string };
      if (!response.ok || !result.id) {
        throw new Error(
          errorCopy[result.code ?? "review_publication_failed"] ??
            "Review publication failed. Please try again.",
        );
      }
      router.push(`/review/${result.id}?just=1`);
    } catch (caught) {
      setStage("verified");
      setError(
        caught instanceof Error
          ? caught.message
          : "Review publication failed. Please try again.",
      );
    }
  };

  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero">
        <div className="eyebrow">VERIFIED LONGHAND REVIEW</div>
        <h1>Share the experience. Keep your identity private.</h1>
        <p>
          Your purchase credential is used locally to generate proof. Your
          email, Stripe payment and personal information are not included in
          the public review.
        </p>
      </section>
      <section className="section review-form">
        <label>
          Rating
          <span className="star-picker" role="radiogroup" aria-label="Rating">
            {[5, 4, 3, 2, 1].map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  aria-label={`${value} stars`}
                />
                <span aria-hidden="true">★</span>
              </label>
            ))}
          </span>
        </label>
        <label>
          Review title
          <input
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Your review
          <textarea
            value={body}
            minLength={20}
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <label>
          Public identity
          <select
            value={identityType}
            onChange={(event) => setIdentityType(event.target.value)}
          >
            <option>Anonymous</option>
            <option>First name only</option>
            <option>Custom alias</option>
          </select>
        </label>
        {identityType === "First name only" && (
          <label>
            First name
            <input
              value={firstName}
              maxLength={40}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
        )}
        {identityType === "Custom alias" && (
          <label>
            Custom alias
            <input
              value={customIdentity}
              maxLength={40}
              onChange={(event) => setCustomIdentity(event.target.value)}
            />
          </label>
        )}
        {stage === "verified" && (
          <p className="status">Purchase eligibility verified locally</p>
        )}
        {error && <p className="form-error">{error}</p>}
        {stage !== "verified" && stage !== "publishing" ? (
          <button
            className="button"
            disabled={
              stage === "issuing" ||
              stage === "proving" ||
              !title ||
              body.length < 20 ||
              ((identityType === "Custom alias" && !customIdentity) ||
                (identityType === "First name only" && !firstName))
            }
            onClick={generatePrivateProof}
          >
            {stage === "issuing"
              ? "Issuing private credential…"
              : stage === "proving"
                ? "Generating private proof…"
                : "Generate private proof"}
          </button>
        ) : (
          <button
            className="button"
            disabled={stage === "publishing"}
            onClick={publish}
          >
            {stage === "publishing" ? "Verifying and publishing…" : "Verify and publish"}
          </button>
        )}
      </section>
      <Footer />
    </main>
  );
}
