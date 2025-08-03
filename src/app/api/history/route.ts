// app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server";

const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY!;
const ETHERSCAN_API_URL = "https://api-sepolia.etherscan.io/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const page = searchParams.get("page") || "1";
  const offset = searchParams.get("offset") || "5";

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  // 查 ERC20 Token Transfer
  const url = `${ETHERSCAN_API_URL}?module=account&action=tokentx&address=${address}&page=${page}&offset=${offset}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.result && Array.isArray(data.result)) {
      return NextResponse.json({ result: data.result });
    } else {
      return NextResponse.json({ result: [] });
    }
  } catch (err) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
