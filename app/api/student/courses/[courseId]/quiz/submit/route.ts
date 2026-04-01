import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);

    // Verify enrollment
    const enrollmentSnap = await adminDb.collection('enrollments')
      .where('uid', '==', decoded.uid)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (enrollmentSnap.empty) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    const { answers } = await req.json();

    // Fetch quiz with correct answers (server-side only)
    const quizDoc = await adminDb.collection('quizzes').doc(courseId).get();
    if (!quizDoc.exists) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const quiz = quizDoc.data()!;
    const questions: any[] = quiz.questions;

    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return NextResponse.json({ error: 'Invalid answers: must answer all questions' }, { status: 400 });
    }

    // Score server-side — answers never trusted from client
    let correct = 0;
    const results = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) correct++;
      return { questionId: q.id, correct: isCorrect, correctAnswer: q.correctAnswer };
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Persist the attempt
    await adminDb.collection('quiz_attempts').add({
      quizId: courseId,
      courseId,
      studentUid: decoded.uid,
      answers,
      score,
      passed,
      attemptedAt: new Date(),
    });

    // Auto-issue certificate on first pass
    if (passed) {
      const certId = `${decoded.uid}_${courseId}`;
      const existingCert = await adminDb.collection('certificates').doc(certId).get();

      if (!existingCert.exists) {
        const [userDoc, courseDocSnap] = await Promise.all([
          adminDb.collection('users').doc(decoded.uid).get(),
          adminDb.collection('courses').doc(courseId).get(),
        ]);

        const userData = userDoc.data();
        const studentName = userData?.fullName
          || `${userData?.firstName ?? ''} ${userData?.lastName ?? ''}`.trim()
          || 'Student';

        await adminDb.collection('certificates').doc(certId).set({
          studentUid: decoded.uid,
          courseId,
          courseName: courseDocSnap.data()?.title || 'Unknown Course',
          studentName,
          issuedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ score, passed, results, passingScore: quiz.passingScore });
  } catch (error: any) {
    console.error('Quiz submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
