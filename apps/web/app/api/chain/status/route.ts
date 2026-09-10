import { NextResponse } from "next/server";

export async function GET() {
  const rpc = process.env.RPC_URL;
  if (!rpc) return NextResponse.json({ configured: false });
  try {
    const response = await fetch(rpc, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]}), cache:"no-store" });
    if (!response.ok) throw new Error("RPC unavailable");
    const result = await response.json();
    return NextResponse.json({ configured: true, chainId: Number.parseInt(result.result, 16) });
  } catch { return NextResponse.json({ configured: false }); }
}
