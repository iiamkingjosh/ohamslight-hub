import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
      await adminAuth.getUserByEmail(email.trim().toLowerCase());
      return NextResponse.json({ exists: true });
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === 'auth/user-not-found') {
        return NextResponse.json({ exists: false });
      }
      throw err;
    }
  } catch (error) {
    console.error('check-email error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
