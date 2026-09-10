type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();
const windowSeconds = 60;
const maxRequests = 10;

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function upstashLimit(key: string) {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, "");
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return undefined;
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds],
      ]),
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const result = (await response.json()) as Array<{ result: number }>;
    return Number(result[0]?.result) <= maxRequests;
  } catch {
    return undefined;
  }
}

export async function rateLimit(request: Request, route: string) {
  const key = `vt:ratelimit:${route}:${clientIp(request)}`;
  const remoteResult = await upstashLimit(key);
  if (remoteResult !== undefined) return remoteResult;

  const now = Date.now();
  const existing = buckets.get(key);
  const elapsed = existing ? (now - existing.updatedAt) / 1000 : windowSeconds;
  const tokens = Math.min(
    maxRequests,
    (existing?.tokens ?? maxRequests) + (elapsed * maxRequests) / windowSeconds,
  );
  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    return false;
  }
  buckets.set(key, { tokens: tokens - 1, updatedAt: now });
  return true;
}
