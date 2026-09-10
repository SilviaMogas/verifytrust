import { NextResponse } from "next/server";
import { submitToRelayer } from "../../../../lib/relayer";
import { rateLimit } from "../../../../lib/ratelimit";
const maxBodyBytes = 64 * 1024;
const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;
const proofPattern = /^0x[0-9a-fA-F]+$/;

const invalidPayload = () =>
  NextResponse.json({ error: "INVALID PAYLOAD" }, { status: 400 });

export async function POST(request: Request) {
  if (!(await rateLimit(request, "relayer/submit"))) {
    return NextResponse.json(
      { code: "rate_limited", message: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return invalidPayload();
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
    return invalidPayload();
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return invalidPayload();
  }
  if (
    body === null ||
    typeof body !== "object" ||
    !("proof" in body) ||
    !("publicInputs" in body) ||
    !("reviewCommitment" in body) ||
    typeof body.proof !== "string" ||
    body.proof.length > 32_000 ||
    !proofPattern.test(body.proof) ||
    !Array.isArray(body.publicInputs) ||
    body.publicInputs.length !== 5 ||
    !body.publicInputs.every(
      (value) => typeof value === "string" && bytes32Pattern.test(value),
    ) ||
    typeof body.reviewCommitment !== "string" ||
    !bytes32Pattern.test(body.reviewCommitment) ||
    /^0x0+$/i.test(body.reviewCommitment)
  ) {
    return invalidPayload();
  }
  const payload = body as {
    proof: `0x${string}`;
    publicInputs: [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`];
    reviewCommitment: `0x${string}`;
  };
  const result = await submitToRelayer(payload);
  if (result.kind === "not_configured") {
    return NextResponse.json({ configured: false, error: result.message }, { status: 503 });
  }
  if (result.kind === "duplicate") {
    return NextResponse.json({
      configured: true,
      error: "NullifierAlreadyUsed",
      errorSelector: result.errorSelector,
      errorName: "NullifierAlreadyUsed",
    }, { status: 400 });
  }
  if (result.kind === "rpc_error") {
    return NextResponse.json({
      configured: true,
      error: result.message,
    }, { status: 400 });
  }
  if (result.kind === "reverted") {
      return NextResponse.json({
        configured:true,
        error:"TRANSACTION REVERTED — NOT VERIFIED",
        ...(result.txHash ? { txHash: result.txHash } : {}),
        registryAddress:result.registryAddress,
        chainId:result.chainId,
        network:result.network,
        explorerUrl:result.explorerUrl,
        relayerAddress:result.relayerAddress,
      }, { status:400 });
  }
  return NextResponse.json({
    configured:true,
    hash:result.hash,
    registryAddress:result.registryAddress,
    chainId:result.chainId,
    network:result.network,
    explorerUrl:result.explorerUrl,
    relayerAddress:result.relayerAddress,
  });
}
