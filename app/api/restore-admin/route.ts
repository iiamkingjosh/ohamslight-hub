import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const actorUid = decoded.uid;

    const actorDoc = await adminDb.collection('users').doc(actorUid).get();
    const actorData = actorDoc.data();
    if (!actorData || actorData.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

    // Restore: update Firestore doc
    await adminDb.collection('users').doc(uid).update({
      deleted: false,
      status: 'active',
    });

    // Re-enable Firebase Auth user
    await adminAuth.updateUser(uid, { disabled: false });

    // Audit log
    await adminDb.collection('auditLogs').add({
      action: 'restore-admin',
      performedBy: actorUid,
      targetUser: uid,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Restore admin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}