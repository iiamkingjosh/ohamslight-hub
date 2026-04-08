import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal server error';
}

function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  return '';
}

async function requireSuperadmin(req: Request) {
  const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('Unauthorized');
  }

  const decoded = await adminAuth.verifyIdToken(idToken);
  const actorUid = decoded.uid;
  const actorDoc = await adminDb.collection('users').doc(actorUid).get();
  const actorData = actorDoc.data();

  if (!actorData || actorData.role !== 'superadmin') {
    const error = new Error('Forbidden');
    error.name = 'ForbiddenError';
    throw error;
  }

  return { actorUid, actorData };
}

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);

    const snapshot = await adminDb
      .collection('users')
      .where('role', '==', 'student')
      .orderBy('createdAt', 'desc')
      .get();

    const students = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((student) => !student.deleted);

    return NextResponse.json(students);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const status = message === 'Unauthorized' ? 401 : getErrorName(error) === 'ForbiddenError' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { actorUid } = await requireSuperadmin(req);
    const { uid, action } = await req.json();

    if (!uid || !action || !['invite', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Missing uid or invalid action' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (userData.role !== 'student') {
      return NextResponse.json({ error: 'Only students can be invited to admin' }, { status: 400 });
    }

    if (action === 'invite') {
      await userRef.set(
        {
          adminInvitation: {
            status: 'pending',
            invitedBy: actorUid,
            invitedAt: new Date(),
          },
        },
        { merge: true }
      );

      await adminDb.collection('notifications').doc(uid).collection('items').add({
        title: 'Admin invitation received',
        message: 'A superadmin invited you to become an admin. Review it from your student dashboard.',
        type: 'admin_invite',
        link: '/student',
        read: false,
        createdAt: new Date(),
      });

      await adminDb.collection('auditLogs').add({
        action: 'invite-admin',
        performedBy: actorUid,
        targetUser: uid,
        metadata: { previousStatus: userData.adminInvitation?.status ?? null },
        timestamp: new Date(),
      });
    }

    if (action === 'revoke') {
      await userRef.set({ adminInvitation: null }, { merge: true });

      await adminDb.collection('auditLogs').add({
        action: 'revoke-admin-invite',
        performedBy: actorUid,
        targetUser: uid,
        timestamp: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const status = message === 'Unauthorized' ? 401 : getErrorName(error) === 'ForbiddenError' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}