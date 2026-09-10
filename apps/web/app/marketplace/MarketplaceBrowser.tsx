"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Merchant, Product } from "../../lib/catalog";

type ProductStats = {
  count: number;
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

const findMerchant = (merchants: Merchant[], product: Product) =>
  merchants.find((merchant) => merchant.slug === product.merchantSlug);

export default function MarketplaceBrowser({
  products,
  merchants,
  stats,
}: {
  products: Product[];
  merchants: Merchant[];
  stats: Record<string, ProductStats>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Any");
  const [minimumRating, setMinimumRating] = useState("Any");
  const [verificationType, setVerificationType] = useState("Any");
  const [sort, setSort] = useState("Newest");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minimumRating === "Any" ? null : Number(minimumRating);
    return products
      .filter((product) => {
        const merchant = findMerchant(merchants, product);
        const productStats = stats[product.slug];
        const matchesSearch =
          !query ||
          product.name.toLowerCase().includes(query) ||
          merchant?.name.toLowerCase().includes(query);
        const matchesCategory =
          category === "Any" || merchant?.category === category;
        const matchesRating =
          minimum === null ||
          (productStats.average !== null && productStats.average >= minimum);
        const matchesVerification =
          verificationType === "Any" ||
          merchant?.verificationTypes.includes(verificationType);
        return (
          matchesSearch &&
          matchesCategory &&
          matchesRating &&
          matchesVerification
        );
      })
      .sort((left, right) => {
        if (sort === "Highest rated") {
          return (stats[right.slug].average ?? -1) - (stats[left.slug].average ?? -1);
        }
        if (sort === "Most reviewed") {
          return stats[right.slug].count - stats[left.slug].count;
        }
        return Date.parse(right.listedAt) - Date.parse(left.listedAt);
      });
  }, [
    category,
    merchants,
    minimumRating,
    products,
    search,
    sort,
    stats,
    verificationType,
  ]);
  const reset = () => {
    setSearch("");
    setCategory("Any");
    setMinimumRating("Any");
    setVerificationType("Any");
    setSort("Newest");
  };

  return <div>
    <div className="controls">
      <label>Search products or merchants<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Longhand..." /></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Any</option><option>Experiences</option></select></label>
      <label>Minimum rating<select value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}><option>Any</option><option value="4">4+</option><option value="3">3+</option><option value="2">2+</option><option value="1">1+</option></select></label>
      <label>Verification type<select value={verificationType} onChange={(event) => setVerificationType(event.target.value)}><option>Any</option><option>Stripe purchase</option><option>Private product code</option></select></label>
      <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest</option><option>Highest rated</option><option>Most reviewed</option></select></label>
    </div>
    {filtered.length === 0 ? <div className="empty-state"><h3>No products match these filters yet</h3><p>Try a different search or clear the filters while more verified products come online.</p><button className="button secondary" onClick={reset}>RESET FILTERS</button></div> : <div className="product-grid">{filtered.map((product) => {
      const merchant = findMerchant(merchants, product);
      return <article className="product-card" key={product.slug}>
        <div className="product-card-top"><div className="eyebrow">{product.label || merchant?.name}</div>{product.live && <span className="live-tag">LIVE</span>}</div>
        <Link href={`/merchant/${product.merchantSlug}/${product.slug}`}><h3>{product.name}</h3></Link>
        <p className="muted-small">{merchant?.name} · {merchant?.category}</p>
        <p>{product.description}</p>
        <div className="product-card-meta"><strong className="price">{product.priceLabel}</strong><span className="muted-small">{stats[product.slug].count} verified reviews</span></div>
        <Link className="button" href={`/merchant/${product.merchantSlug}/${product.slug}`}>{product.cta}</Link>
      </article>;
    })}</div>}
    <p className="coming-soon">More integrations coming soon</p>
  </div>;
}
