import { Nav, Footer } from "../components";
import { merchants, products } from "../../lib/catalog";
import { reviewStats } from "../../lib/reviews";
import MarketplaceBrowser from "./MarketplaceBrowser";

export default async function Marketplace() {
  const stats = Object.fromEntries(
    await Promise.all(
      products.map(async (product) => [product.slug, await reviewStats(product.slug)]),
    ),
  );
  return <main className="shell"><Nav /><section className="hero compact-hero"><div className="eyebrow">VERIFIED REVIEW MARKETPLACE</div><h1>Real products.<br /><span className="accent">Private proof.</span></h1><p>Explore products from merchants building a better way to trust reviews.</p></section><section className="section"><div className="section-heading"><div><div className="label">MARKETPLACE</div><h2>Shop with confidence.</h2></div><span className="muted-small">{products.length} listed products · {merchants.length} live pilot</span></div><MarketplaceBrowser products={products} merchants={merchants} stats={stats} /></section><Footer /></main>;
}
