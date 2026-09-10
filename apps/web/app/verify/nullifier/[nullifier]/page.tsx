import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deployments,
  fieldFromString,
  getVerificationByNullifier,
} from "@verifytrust/sdk";
import { Footer, Nav } from "../../../components";
import { CopyButton } from "../../../CopyButton";
import { merchants, products } from "../../../../lib/catalog";

type ChainVerificationPageProps = {
  params: Promise<{ nullifier: string }>;
};

function VerificationUnavailable() {
  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero state-page">
        <div className="eyebrow">VERIFICATION UNAVAILABLE</div>
        <h1>
          Verification temporarily unavailable — Ethereum RPC could not be
          reached, try again
        </h1>
        <p>
          The chain evidence could not be loaded right now. No review text or
          private purchase information is stored on this page.
        </p>
      </section>
      <Footer />
    </main>
  );
}

function findMerchant(merchantId: string) {
  return merchants.find(
    (merchant) => fieldFromString(merchant.slug).toLowerCase() === merchantId.toLowerCase(),
  );
}

function findProduct(productId: string, merchantSlug?: string) {
  return products.find(
    (product) =>
      (!merchantSlug || product.merchantSlug === merchantSlug) &&
      fieldFromString(`${product.merchantSlug}-${product.slug}`).toLowerCase() ===
        productId.toLowerCase(),
  );
}

export default async function ChainVerificationPage({
  params,
}: ChainVerificationPageProps) {
  const { nullifier } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(nullifier)) notFound();
  const chainId = Number(process.env.CHAIN_ID || 11155111);
  let verification: Awaited<ReturnType<typeof getVerificationByNullifier>>;
  let rpcUnavailable = false;
  try {
    verification = await getVerificationByNullifier({
      rpcUrl:
        process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      chainId,
      nullifier: nullifier as `0x${string}`,
    });
  } catch {
    verification = null;
    rpcUnavailable = true;
  }
  if (rpcUnavailable) return <VerificationUnavailable />;
  if (!verification) notFound();
  const merchant = findMerchant(verification.merchantId);
  const product = findProduct(verification.productId, merchant?.slug);
  const network =
    chainId === 11155111 ? "Ethereum Sepolia" : `Chain ${chainId}`;
  const registryAddress =
    deployments[chainId as keyof typeof deployments]?.verifyTrustRegistry ?? "—";
  const explorerBase =
    chainId === 11155111
      ? process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.etherscan.io"
      : undefined;

  return (
    <main className="shell">
      <Nav />
      <section className="hero compact-hero">
        <div className="eyebrow">VERIFIED</div>
        <h1>This review came from an eligible Longhand customer.</h1>
        <p>
          VerifyTrust confirmed directly from Ethereum that a valid purchase
          credential was used. The proof does not reveal the buyer’s identity
          or payment information.
        </p>
      </section>
      <section className="section">
        <div className="verification-details">
          <div>
            <span>Merchant</span>
            <strong>{merchant?.name ?? "Unknown merchant"}</strong>
          </div>
          <div>
            <span>Product</span>
            <strong>{product?.name ?? "Unknown product"}</strong>
          </div>
          <div>
            <span>Review commitment</span>
            <strong className="mono">{verification.reviewCommitment}</strong>
            <CopyButton value={verification.reviewCommitment} />
          </div>
          <div>
            <span>Network</span>
            <strong>{network}</strong>
          </div>
          <div>
            <span>Contract</span>
            <strong className="mono">{registryAddress}</strong>
            <CopyButton value={registryAddress} />
          </div>
          <div>
            <span>Transaction</span>
            <strong className="mono">
              {explorerBase ? (
                <a
                  className="text-link"
                  href={`${explorerBase}/tx/${verification.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {verification.txHash}
                </a>
              ) : (
                verification.txHash
              )}
            </strong>
            <CopyButton value={verification.txHash} />
          </div>
          <div>
            <span>Block</span>
            <strong>{verification.blockNumber}</strong>
          </div>
          <div>
            <span>Verification time</span>
            <strong>{new Date(verification.verifiedAt * 1000).toLocaleString()}</strong>
          </div>
          <div>
            <span>Nullifier status</span>
            <strong>Used — duplicate reviews blocked</strong>
          </div>
          <div>
            <span>Nullifier</span>
            <strong className="mono">{nullifier}</strong>
            <CopyButton value={nullifier} />
          </div>
        </div>
      </section>
      <section className="section">
        <div className="card">
          <div className="label">PRIVATE BY DESIGN</div>
          <p>
            Verified directly from Ethereum Sepolia; review text is stored
            off-chain.
          </p>
        </div>
        <Link className="button secondary" href="/marketplace">
          Explore marketplace
        </Link>
      </section>
      <Footer />
    </main>
  );
}
