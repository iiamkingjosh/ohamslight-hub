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

    const { uid } = await req.json(); // uid of admin to delete
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

    // Prevent deleting self
    if (uid === actorUid) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Soft delete: update Firestore doc
    await adminDb.collection('users').doc(uid).update({
      deleted: true,
      status: 'inactive',
    });

    // Optionally disable Firebase Auth user (optional)
    await adminAuth.updateUser(uid, { disabled: true });

    // Audit log
    await adminDb.collection('auditLogs').add({
      action: 'delete-admin',
      performedBy: actorUid,
      targetUser: uid,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}