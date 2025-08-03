import { NextResponse } from 'next/server';

///提供前端一組亂數（nonce），等於發一組臨時 Token，讓用戶簽名，預防重放攻擊。
export async function GET() {
  const nonce = Math.random().toString(36).substring(2, 15);
  return new NextResponse(nonce, { status: 200 });
}
