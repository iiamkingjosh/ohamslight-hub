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

    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    await adminDb.collection('courses').doc(courseId).update({
      status: 'published',
    });

    // Optional: audit log
    await adminDb.collection('auditLogs').add({
      action: 'approve-course',
      performedBy: actorUid,
      targetCourse: courseId,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approve course error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}