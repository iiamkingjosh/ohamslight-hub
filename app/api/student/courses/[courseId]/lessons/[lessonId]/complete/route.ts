import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

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

    const enrollmentDoc = enrollmentSnap.docs[0];
    const enrollmentData = enrollmentDoc.data();

    const completedLessons: string[] = enrollmentData.completedLessons || [];
    if (completedLessons.includes(lessonId)) {
      return NextResponse.json({ success: true, progress: enrollmentData.progress || 0 });
    }

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const sections = courseDoc.data()?.content?.sections || [];
    const totalLessons = sections.reduce((acc: number, sec: any) => acc + (sec.lessons?.length || 0), 0);
    const newCompletedCount = completedLessons.length + 1;
    const newProgress = totalLessons > 0
      ? Math.round((newCompletedCount / totalLessons) * 100)
      : 0;

    await enrollmentDoc.ref.update({
      completedLessons: FieldValue.arrayUnion(lessonId),
      progress: newProgress,
      completed: totalLessons > 0 ? newCompletedCount >= totalLessons : false,
      lastLessonId: lessonId,
      lastLessonAt: new Date(),
    });

    return NextResponse.json({ success: true, progress: newProgress });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
