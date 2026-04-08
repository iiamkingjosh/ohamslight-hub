import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
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

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const courseData = courseDoc.data()!;
    const enrollment = enrollmentSnap.docs[0];

    return NextResponse.json({
      course: {
        id: courseDoc.id,
        title: courseData.title,
        description: courseData.description,
        coverImage: courseData.coverImage || '',
      },
      content: courseData.content || { sections: [] },
      progress: enrollment.data().progress || 0,
      completedLessons: enrollment.data().completedLessons || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
