import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // RFC 8058 One-Click Unsubscribe
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (email) {
      console.log(`[Unsubscribe One-Click] Email desinscrito: ${email}`);
    }
  } catch (err) {
    // Ignore parse error
  }

  return new NextResponse('Unsubscribed successfully', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email') || '';
  const redirectUrl = new URL('/unsubscribe', req.url);
  if (email) {
    redirectUrl.searchParams.set('email', email);
  }
  return NextResponse.redirect(redirectUrl);
}

