import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PublishedReview } from "./reviews";

type StoreFile = {
  reviews: PublishedReview[];
  duplicateNullifiers: string[];
  paidSessions: Record<string, PaidSession>;
};

export type PaidSession = {
  sessionId: string;
  paidAt: string;
};

const storeFile =
  process.env.REVIEW_STORE_FILE ??
  path.join(os.tmpdir(), "verifytrust-reviews.json");
const kvUrl = process.env.KV_REST_API_URL?.replace(/\/$/, "");
const kvToken = process.env.KV_REST_API_TOKEN;

const useKv = Boolean(kvUrl && kvToken);
let mutationQueue = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const operation = mutationQueue.then(fn, fn);
  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

export function storeBackend(): "upstash" | "file" {
  return useKv ? "upstash" : "file";
}

async function kvCommand<T>(command: string[]): Promise<T> {
  if (!kvUrl || !kvToken) throw new Error("review store is not configured");
  const response = await fetch(kvUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kvToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("review store unavailable");
  const body = (await response.json()) as { result: T };
  return body.result;
}

async function readFileStore(): Promise<StoreFile> {
  try {
    const value = JSON.parse(
      await fs.readFile(/* turbopackIgnore: true */ storeFile, "utf8"),
    ) as Partial<StoreFile>;
    return {
      reviews: Array.isArray(value.reviews) ? value.reviews : [],
      duplicateNullifiers: Array.isArray(value.duplicateNullifiers)
        ? value.duplicateNullifiers
        : [],
      paidSessions:
        value.paidSessions && typeof value.paidSessions === "object"
          ? value.paidSessions
          : {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { reviews: [], duplicateNullifiers: [], paidSessions: {} };
    }
    throw error;
  }
}

async function writeFileStore(value: StoreFile) {
  await fs.mkdir(path.dirname(storeFile), { recursive: true });
  const temporary = `${storeFile}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temporary, storeFile);
}

export async function saveReview(review: PublishedReview) {
  if (useKv) {
    await kvCommand(["SET", `vt:review:${review.id}`, JSON.stringify(review)]);
    await kvCommand(["LPUSH", "vt:reviews", review.id]);
    return;
  }
  await withLock(async () => {
    const store = await readFileStore();
    store.reviews = [
      review,
      ...store.reviews.filter((item) => item.id !== review.id),
    ];
    await writeFileStore(store);
  });
}

export async function getReview(id: string): Promise<PublishedReview | undefined> {
  if (useKv) {
    const value = await kvCommand<string | null>(["GET", `vt:review:${id}`]);
    return value ? (JSON.parse(value) as PublishedReview) : undefined;
  }
  const store = await readFileStore();
  return store.reviews.find((review) => review.id === id);
}

export async function listReviews(filter?: {
  merchantSlug?: string;
  productSlug?: string;
}): Promise<PublishedReview[]> {
  const reviews = useKv
    ? await (async () => {
        const ids = await kvCommand<string[]>(["LRANGE", "vt:reviews", "0", "-1"]);
        const values = await Promise.all(
          ids.map((id) => kvCommand<string | null>(["GET", `vt:review:${id}`])),
        );
        return values
          .filter((value): value is string => Boolean(value))
          .map((value) => JSON.parse(value) as PublishedReview);
      })()
    : (await readFileStore()).reviews;
  return reviews.filter(
    (review) =>
      (!filter?.merchantSlug || review.merchantSlug === filter.merchantSlug) &&
      (!filter?.productSlug || review.productSlug === filter.productSlug),
  );
}

export async function recordDuplicateAttempt(nullifier: string) {
  if (useKv) {
    await kvCommand(["SADD", "vt:dupes", nullifier]);
    return;
  }
  await withLock(async () => {
    const store = await readFileStore();
    if (!store.duplicateNullifiers.includes(nullifier)) {
      store.duplicateNullifiers.push(nullifier);
      await writeFileStore(store);
    }
  });
}

export async function recordPaidSession(paidSession: PaidSession) {
  if (useKv) {
    await kvCommand([
      "SET",
      `vt:paid-session:${paidSession.sessionId}`,
      JSON.stringify(paidSession),
    ]);
    return;
  }
  await withLock(async () => {
    const store = await readFileStore();
    store.paidSessions[paidSession.sessionId] = paidSession;
    await writeFileStore(store);
  });
}

export async function getPaidSession(
  sessionId: string,
): Promise<PaidSession | undefined> {
  if (useKv) {
    const value = await kvCommand<string | null>([
      "GET",
      `vt:paid-session:${sessionId}`,
    ]);
    return value ? (JSON.parse(value) as PaidSession) : undefined;
  }
  return (await readFileStore()).paidSessions[sessionId];
}

export async function countDuplicateAttempts(): Promise<number> {
  if (useKv) return Number(await kvCommand<number>(["SCARD", "vt:dupes"]));
  return (await readFileStore()).duplicateNullifiers.length;
}
