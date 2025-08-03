import { NextResponse } from 'next/server';

///處理「登出」API，像是 iOS/Flutter 的「後端 session logout handler」。
export async function POST() {
  return NextResponse.json({ ok: true });
}
