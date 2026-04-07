import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    projectId: process.env.FIREBASE_PROJECT_ID ? 'defined' : 'undefined',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'defined' : 'undefined',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'defined' : 'undefined',
  });
}