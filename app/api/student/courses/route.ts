import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// Define the shape of an enrollment document
interface EnrollmentData {
  uid: string;
  courseId: string;
  progress: number;
  completed: boolean;
  lastLessonId?: string | null;
  lastLessonAt?: FirebaseFirestore.Timestamp | null;
  enrolledAt: FirebaseFirestore.Timestamp;
}

export async function GET(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const studentUid = decoded.uid;

    // Get enrollments for this student
    const enrollmentsSnap = await adminDb.collection('enrollments')
      .where('uid', '==', studentUid)
      .get();

    const enrollments = enrollmentsSnap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as EnrollmentData) // 👈 cast to correct type
    }));

    // Fetch course details for each enrollment
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseDoc = await adminDb.collection('courses').doc(enrollment.courseId).get();
        return {
          enrollmentId: enrollment.id,
          uid: enrollment.uid,
          courseId: enrollment.courseId,
          progress: enrollment.progress || 0,
          completed: enrollment.completed || false,
          lastLessonId: enrollment.lastLessonId || null,
          lastLessonAt: enrollment.lastLessonAt || null,
          enrolledAt: enrollment.enrolledAt,
          course: courseDoc.exists ? { id: courseDoc.id, ...courseDoc.data() } : null,
        };
      })
    );

    return NextResponse.json(coursesWithProgress);
  } catch (error: unknown) {
    console.error('Fetch student courses error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}