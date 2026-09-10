import ReviewWriter from "./ReviewWriter";

type WriteReviewPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

export default async function WriteReviewPage({
  searchParams,
}: WriteReviewPageProps) {
  const value = (await searchParams).session_id;
  const sessionId = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return <ReviewWriter sessionId={sessionId} />;
}
