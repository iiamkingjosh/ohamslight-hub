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

    // Verify student is enrolled
    const enrollmentSnap = await adminDb.collection('enrollments')
      .where('uid', '==', decoded.uid)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (enrollmentSnap.empty) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    const quizDoc = await adminDb.collection('quizzes').doc(courseId).get();
    if (!quizDoc.exists) return NextResponse.json({ quiz: null, lastAttempt: null });

    const quizData = quizDoc.data()!;

    // Strip correct answers before sending to client
    const safeQuiz = {
      id: quizDoc.id,
      courseId: quizData.courseId,
      title: quizData.title,
      description: quizData.description,
      passingScore: quizData.passingScore,
      questions: (quizData.questions as any[]).map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        // correctAnswer intentionally omitted
      })),
    };

    // Get student's latest attempt
    const attemptsSnap = await adminDb.collection('quiz_attempts')
      .where('courseId', '==', courseId)
      .where('studentUid', '==', decoded.uid)
      .orderBy('attemptedAt', 'desc')
      .limit(1)
      .get();

    const lastAttempt = attemptsSnap.empty
      ? null
      : { id: attemptsSnap.docs[0].id, ...attemptsSnap.docs[0].data() };

    return NextResponse.json({ quiz: safeQuiz, lastAttempt });
  } catch (error: any) {
    console.error('Get student quiz error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
