import { NextResponse } from 'next/server';

export async function GET() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  return NextResponse.json({
    projectId: process.env.FIREBASE_PROJECT_ID ? 'defined' : 'undefined',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'defined' : 'undefined',
    privateKey: privateKey ? `defined (starts with: ${privateKey.substring(0, 30)}...)` : 'undefined',
  });
}