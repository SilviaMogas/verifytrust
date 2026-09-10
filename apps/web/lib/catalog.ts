export type Merchant = {
  slug: "longhand";
  name: string;
  tagline: string;
  description: string;
  website: "https://longhand.cards";
  category: "Experiences";
  verificationPartner: string;
  paymentVerification: string;
  deliveryVerification: string;
  integrationStatus: "Live pilot";
  verificationTypes: string[];
};

export type Product = {
  slug: string;
  merchantSlug: "longhand";
  name: string;
  label?: string;
  description: string;
  priceLabel: string;
  priceCents: number;
  badges: string[];
  cta: string;
  live: boolean;
  listedAt: string;
};

export const merchants: Merchant[] = [
  {
    slug: "longhand",
    name: "Longhand",
    tagline: "A real postcard, and the private story behind it.",
    description:
      "Longhand creates handwritten postcard experiences with a private digital layer. Each physical postcard can unlock photographs, a voice note and the longer story behind the journey.",
    website: "https://longhand.cards",
    category: "Experiences",
    verificationPartner: "VerifyTrust",
    paymentVerification: "Stripe",
    deliveryVerification: "Private postcard code",
    integrationStatus: "Live pilot",
    verificationTypes: ["Stripe purchase", "Private product code"],
  },
];

export const products: Product[] = [
  {
    slug: "verified-membership",
    merchantSlug: "longhand",
    name: "Longhand Verified Membership",
    label: "LIVE VERIFICATION PRODUCT",
    description:
      "A $1 digital membership created for the first real VerifyTrust integration. Your payment gives you the right to leave one verified review.",
    priceLabel: "$1 one time",
    priceCents: 100,
    badges: [
      "Stripe verified",
      "One verified review",
      "No wallet required",
      "Identity protected",
    ],
    cta: "Pay $1 and review",
    live: true,
    listedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    slug: "one-postcard",
    merchantSlug: "longhand",
    name: "One Postcard",
    description:
      "One handwritten postcard from the road, with a private story and a way to write back.",
    priceLabel: "$29 one time",
    priceCents: 2900,
    badges: [],
    cta: "View product",
    live: false,
    listedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    slug: "three-months",
    merchantSlug: "longhand",
    name: "Three Months",
    description:
      "Three handwritten postcards delivered over three months, each with its own private story.",
    priceLabel: "$69 total",
    priceCents: 6900,
    badges: [],
    cta: "View product",
    live: false,
    listedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    slug: "postcard-year",
    merchantSlug: "longhand",
    name: "The Postcard Year",
    description:
      "A twelve-month journey told through real postcards, private stories, photographs and voice notes.",
    priceLabel: "$15 per month",
    priceCents: 1500,
    badges: [],
    cta: "View product",
    live: false,
    listedAt: "2026-01-04T00:00:00.000Z",
  },
];

export const categories = ["Experiences"];
export const verificationTypes = ["Stripe purchase", "Private product code"];

export function getMerchant(slug: string) {
  return merchants.find((merchant) => merchant.slug === slug);
}

export function getProduct(merchantSlug: string, productSlug: string) {
  return products.find(
    (product) =>
      product.merchantSlug === merchantSlug && product.slug === productSlug,
  );
}

export function productsForMerchant(slug: string) {
  return products.filter((product) => product.merchantSlug === slug);
}
