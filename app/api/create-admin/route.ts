import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    // Verify ID token from Authorization header
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const actorUid = decoded.uid;

    // Check if actor is superadmin
    const actorDoc = await adminDb.collection('users').doc(actorUid).get();
    const actorData = actorDoc.data();
    if (!actorData || actorData.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const { email, password, firstName, lastName, username, phone } = await req.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create Firestore user document with role 'admin'
    const userData = {
      uid: userRecord.uid,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      username,
      phone: phone || '',
      email,
      role: 'admin',
      deleted: false,
      profileCompleted: true,
      status: 'active',
      createdAt: new Date(),
    };
    await adminDb.collection('users').doc(userRecord.uid).set(userData);

    // Create audit log
    await adminDb.collection('auditLogs').add({
      action: 'create-admin',
      performedBy: actorUid,
      targetUser: userRecord.uid,
      metadata: { email },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}