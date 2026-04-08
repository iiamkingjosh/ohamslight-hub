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
    if (!actorData || !['admin', 'superadmin'].includes(actorData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid, newRole } = await req.json();
    if (!uid || !newRole) return NextResponse.json({ error: 'Missing uid or newRole' }, { status: 400 });

    if (newRole === 'teacher') {
      return NextResponse.json(
        { error: 'Teacher role must be assigned through the teacher request approval flow.' },
        { status: 400 }
      );
    }

    // Prevent admin from changing another admin's role or superadmin's role
    const targetDoc = await adminDb.collection('users').doc(uid).get();
    const targetData = targetDoc.data();
    if (!targetData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Superadmin can do anything; admin cannot modify superadmin or other admins
    if (actorData.role === 'admin') {
      if (targetData.role === 'superadmin') {
        return NextResponse.json({ error: 'Cannot modify superadmin' }, { status: 403 });
      }
      if (targetData.role === 'admin' && uid !== actorUid) {
        return NextResponse.json({ error: 'Cannot modify other admins' }, { status: 403 });
      }
    }

    await adminDb.collection('users').doc(uid).update({ role: newRole });

    // Audit log
    await adminDb.collection('auditLogs').add({
      action: 'update-role',
      performedBy: actorUid,
      targetUser: uid,
      metadata: { oldRole: targetData.role, newRole },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Update role error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}