# Marketplace content and UX specification (approved product direction)

The product must be understandable to someone who knows nothing about zero-knowledge proofs.
Lead with reviews, products and trust. Technical infrastructure should support the experience without dominating it.

## Main navigation
- Marketplace
- For Businesses
- How It Works
- Privacy
- Technical Demo
- `Add your business` CTA

The VerifyTrust logo should return to the marketplace homepage.

## Homepage hero
Eyebrow: PRIVACY-PRESERVING REVIEWS
Headline: Real customers. Verified experiences. Private by design.
Supporting copy: VerifyTrust confirms that a review comes from a genuine purchase without exposing the person, payment or private data behind it.
Primary CTA: Explore verified reviews
Secondary CTA: Add your business
Trust line: Purchase verified · Identity protected · Duplicate reviews prevented

Do not mention Noir, nullifiers or Ethereum in the main hero.

## Featured merchant section
Section title: First live integration
Featured card:
  Longhand
  A real postcard, and the private story behind it.
  Longhand is the first merchant using VerifyTrust to connect a real Stripe purchase with a privacy-preserving product review.
Badges: Live pilot · Real payment · Verified reviews · Privacy protected
Primary CTA: View Longhand reviews
Secondary CTA: Visit Longhand.cards

Show the Longhand Verified Membership prominently:
  Longhand Verified Membership
  Join the first live VerifyTrust merchant experience. Complete a real $1 payment and leave one verified review without making your identity or payment details public.
  Price: $1 one time
  CTA: Join and review for $1

## Merchant page — route `/merchant/longhand`
Hero:
  Longhand
  A real postcard, and the story behind it.
Merchant description: Longhand creates handwritten postcard experiences with a private digital layer. Each physical postcard can unlock photographs, a voice note and the longer story behind the journey.
Merchant information:
- Website: longhand.cards
- Category: Experiences
- Verification partner: VerifyTrust
- Payment verification: Stripe
- Delivery verification: Private postcard code
- Integration status: Live pilot

Show the products directly under the merchant information. Place Longhand Verified Membership first.

### Product card copy
Longhand Verified Membership
  Label: LIVE VERIFICATION PRODUCT
  Description: A $1 digital membership created for the first real VerifyTrust integration. Your payment gives you the right to leave one verified review.
  Price: $1 one time
  Badges: Stripe verified · One verified review · No wallet required · Identity protected
  CTA: Pay $1 and review

One Postcard
  Description: One handwritten postcard from the road, with a private story and a way to write back.
  Price: $29 one time
  CTA: View product

Three Months
  Description: Three handwritten postcards delivered over three months, each with its own private story.
  Price: $69 total
  CTA: View product

The Postcard Year
  Description: A twelve-month journey told through real postcards, private stories, photographs and voice notes.
  Price: $15 per month
  CTA: View product

## Product page
The $1 product page must contain: Product name, Merchant name, Product description, Exact price, Purchase CTA, Average verified rating, Verified review count, Rating distribution, Published reviews, Verification explanation, Privacy explanation.

Before any review exists, use:
  No verified reviews yet
  Be the first Longhand member to complete a real purchase and leave a privacy-protected verified review.
  CTA: Become the first verified reviewer

Do not seed fake reviews to make the marketplace look active.

## Payment success page
After Stripe confirms payment, show:
  Eyebrow: PAYMENT CONFIRMED
  Headline: You are eligible to leave a verified review.
  Copy: Your $1 Longhand membership has been confirmed. VerifyTrust can prove that you made an eligible purchase without publishing your identity, email or payment information.
Private information list: Your name stays private · Your email stays private · Your Stripe payment stays private · Your purchase history stays private
Public result: Valid Longhand purchase · Product reviewed · Rating and review · Verification status · Duplicate prevention
Primary CTA: Leave my verified review
Secondary CTA: Return to Longhand

Do not show the review CTA until payment has been verified server-side.

## Review form copy
Eyebrow: VERIFIED LONGHAND REVIEW
Headline: Share the experience. Keep your identity private.
Fields: Rating · Review title · Your review · Public identity
Public identity options: Anonymous · First name only · Custom alias (default Anonymous)
Privacy notice: Your purchase credential is used locally to generate proof. Your email, Stripe payment and personal information are not included in the public review.
Primary CTA: Generate private proof
After local proof verification: Purchase eligibility verified locally
Next CTA: Verify and publish

## Published review state
Headline: Your review is verified.
Supporting copy: The review is now connected to proof of a valid Longhand purchase. Your private purchase data was not published.
Badges: Verified Purchase · Privacy Protected · Duplicate Protected · Ethereum Verified (only when a real transaction succeeds)
Actions: View public review · View verification · Return to Longhand · Explore marketplace

## Public verification page copy
Status: VERIFIED
Headline: This review came from an eligible Longhand customer.
Explanation: VerifyTrust confirmed that a valid purchase credential was used for this review. The proof does not reveal the buyer’s identity or payment information.
Verification details: Merchant · Product · Review commitment · Network · Contract · Transaction · Verification time · Nullifier status
Private by design: The reviewer’s name, email, postal address, Stripe identifiers, receipt and purchase history were not published.

## Technical demo
Keep `/demo`, but rename it in navigation: Technical Demo
Add an introduction: This page demonstrates the cryptographic process behind VerifyTrust. For the customer experience, visit the review marketplace.
CTA: Open marketplace
Replace visible NOVA GOODS content with Longhand. Use the $1 Longhand Verified Membership as the demonstration product.
Clearly distinguish between: a real Stripe purchase · a locally generated credential · a configured Sepolia verification · a development fallback.
Never describe fallback data as a real purchase.

## For Businesses page
Headline: Verified reviews without building a surveillance system.
Copy: VerifyTrust allows businesses to prove that reviewers were eligible customers while keeping personal and payment information outside the public review record.
Integration steps: Connect purchase confirmation · Issue private eligibility credentials · Let customers prove locally · Publish verified product reviews · Prevent duplicate submissions
Supported verification sources: Stripe purchases · Subscription status · Order fulfilment · Ticket ownership · Membership access · Private product codes
CTA: Apply to become an integrated merchant
Longhand should be shown as the first implementation example. Do not invent additional integrated businesses.

## Search and filtering
Search by merchant · Search by product · Filter by category · Filter by rating · Filter by verification type · Sort by newest · Sort by highest rated · Sort by most reviewed.
With only Longhand available, controls must still work and return honest results. Do not populate fake merchants.
A secondary section may say: More integrations coming soon. Do not display invented company logos.

## Marketplace metrics
Only calculate metrics from stored real data. Allowed: integrated merchants · products · published verified reviews · prevented duplicate attempts.
Initial legitimate values: 1 live pilot · 4 listed Longhand products · 0 verified reviews before the first completed flow.
Do not call four hardcoded products “traction”.

## Mobile experience
The complete purchase and review journey must work on mobile: no horizontal overflow · product cards readable · full-width buttons where appropriate · ratings accessible · long hashes wrap safely · verification info copyable · loading states visible · error messages explain what failed.

## Error states
Customer-facing errors for: Payment cancelled · Payment not confirmed · Invalid eligibility token · Expired eligibility token · Eligibility already used · Credential issuance failed · Local proof failed · Ethereum unavailable · Relayer unavailable · Duplicate review · Review publication failed.
Never show raw server errors, secrets or stack traces.
