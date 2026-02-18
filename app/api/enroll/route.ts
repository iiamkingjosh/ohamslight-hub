import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const studentUid = decoded.uid;

    // Verify student role
    const studentDoc = await adminDb.collection('users').doc(studentUid).get();
    const studentData = studentDoc.data();
    if (!studentData || studentData.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    // Check if already enrolled
    const existing = await adminDb.collection('enrollments')
      .where('uid', '==', studentUid)
      .where('courseId', '==', courseId)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: 'Already enrolled' }, { status: 400 });
    }

    // Create enrollment
    await adminDb.collection('enrollments').add({
      uid: studentUid,
      courseId,
      progress: 0,
      completed: false,
      enrolledAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}