import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const { courseId, lessonId } = await params;
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);

    const enrollmentSnap = await adminDb
      .collection('enrollments')
      .where('uid', '==', decoded.uid)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (enrollmentSnap.empty) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    await enrollmentSnap.docs[0].ref.update({
      lastLessonId: lessonId,
      lastLessonAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
