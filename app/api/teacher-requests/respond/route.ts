import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const actorUid = decoded.uid;
    const actorDoc = await adminDb.collection('users').doc(actorUid).get();
    const actorData = actorDoc.data();

    if (!actorData || !['admin', 'superadmin'].includes(actorData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid, decision } = await req.json();
    if (!uid || !decision || !['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'Missing uid or invalid decision' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'student') {
      return NextResponse.json({ error: 'Only student accounts can be approved as teachers' }, { status: 400 });
    }

    const teacherRequest = userData.teacherRequest;
    if (!teacherRequest || teacherRequest.status !== 'pending') {
      return NextResponse.json({ error: 'No pending teacher request found' }, { status: 400 });
    }

    if (decision === 'approve') {
      await userRef.set(
        {
          role: 'teacher',
          teacherRequest: {
            ...teacherRequest,
            status: 'approved',
            respondedAt: new Date(),
            reviewedBy: actorUid,
          },
        },
        { merge: true }
      );
    } else {
      await userRef.set(
        {
          teacherRequest: {
            ...teacherRequest,
            status: 'rejected',
            respondedAt: new Date(),
            reviewedBy: actorUid,
          },
        },
        { merge: true }
      );
    }

    await adminDb.collection('notifications').doc(uid).collection('items').add({
      title: decision === 'approve' ? 'Teacher access approved' : 'Teacher access request declined',
      message:
        decision === 'approve'
          ? 'Your teacher access request was approved. You can now access the teacher workspace.'
          : 'Your teacher access request was declined. You can try again later or contact an admin.',
      type: decision === 'approve' ? 'teacher_request_approved' : 'teacher_request_rejected',
      link: decision === 'approve' ? '/teacher' : '/student',
      read: false,
      createdAt: new Date(),
    });

    await adminDb.collection('auditLogs').add({
      action: decision === 'approve' ? 'approve-teacher-request' : 'reject-teacher-request',
      performedBy: actorUid,
      targetUser: uid,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Teacher request review error:', error);
    const message = error instanceof Error ? error.message : 'Failed to review teacher request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}