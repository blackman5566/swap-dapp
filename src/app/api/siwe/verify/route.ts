import { NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';

///負責驗證錢包簽名跟 message，等於你自己的 Auth 登入 API。
export async function POST(req: Request) {
  const { message, signature } = await req.json();
  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SIWE verify failed:', e);
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
