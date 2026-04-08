import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const { firstName, lastName, username, phone } = await req.json();

    if (!firstName || !lastName || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userRecord = await adminAuth.getUser(decoded.uid);

    const userData = {
      uid: decoded.uid,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      username,
      phone: phone || '',
      email: userRecord.email || '',
      role: 'student',
      deleted: false,
      profileCompleted: true,
      status: 'active',
      createdAt: new Date(),
    };

    await adminDb.collection('users').doc(decoded.uid).set(userData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Create profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
