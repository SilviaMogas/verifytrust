import { notFound } from "next/navigation";
import { Footer, Nav, ProductCard } from "../../components";
import { getMerchant, productsForMerchant } from "../../../lib/catalog";

export function generateStaticParams() {
  return [{ slug: "longhand" }];
}

export default async function MerchantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchant = getMerchant(slug);
  if (!merchant) notFound();
  const merchantProducts = productsForMerchant(merchant.slug);
  return <main className="shell"><Nav /><section className="hero compact-hero"><div className="eyebrow">MERCHANT · {merchant.integrationStatus}</div><h1>{merchant.name}<br /><span className="accent">A real postcard, and the story behind it.</span></h1><p>{merchant.description}</p><a className="text-link" href={merchant.website} target="_blank" rel="noreferrer">Visit longhand.cards ↗</a></section><section className="section"><div className="merchant-info"><div><span>Website</span><a href={merchant.website} target="_blank" rel="noreferrer">{merchant.website.replace("https://", "")}</a></div><div><span>Category</span><strong>{merchant.category}</strong></div><div><span>Verification partner</span><strong>{merchant.verificationPartner}</strong></div><div><span>Payment verification</span><strong>{merchant.paymentVerification}</strong></div><div><span>Delivery verification</span><strong>{merchant.deliveryVerification}</strong></div><div><span>Integration status</span><strong className="status">{merchant.integrationStatus}</strong></div></div></section><section className="section"><div className="label">LONGHAND PRODUCTS</div><h2>Choose your experience.</h2><div className="product-grid">{merchantProducts.map((product) => <ProductCard product={product} key={product.slug} />)}</div></section><Footer /></main>;
}
