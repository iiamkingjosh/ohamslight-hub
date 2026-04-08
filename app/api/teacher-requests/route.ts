import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (userData.role !== 'student') {
      return NextResponse.json({ error: 'Only students can request teacher access' }, { status: 400 });
    }

    if (userData.teacherRequest?.status === 'pending') {
      return NextResponse.json({ error: 'A teacher request is already pending' }, { status: 400 });
    }

    await userRef.set(
      {
        teacherRequest: {
          status: 'pending',
          requestedAt: new Date(),
          respondedAt: null,
          reviewedBy: null,
        },
      },
      { merge: true }
    );

    const reviewers = await adminDb.collection('users').where('role', 'in', ['admin', 'superadmin']).get();
    const batch = adminDb.batch();

    reviewers.docs.forEach((reviewerDoc) => {
      batch.set(
        adminDb.collection('notifications').doc(reviewerDoc.id).collection('items').doc(),
        {
          title: 'Teacher access request',
          message: `${userData.fullName || userData.email} requested teacher access.`,
          type: 'teacher_request',
          link: '/admin/users',
          read: false,
          createdAt: new Date(),
        }
      );
    });

    await batch.commit();

    await adminDb.collection('auditLogs').add({
      action: 'request-teacher-role',
      performedBy: uid,
      targetUser: uid,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Teacher request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit teacher request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}