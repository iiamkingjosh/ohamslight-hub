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

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const quizDoc = await adminDb.collection('quizzes').doc(courseId).get();
    if (!quizDoc.exists) return NextResponse.json(null);

    return NextResponse.json({ id: quizDoc.id, ...quizDoc.data() });
  } catch (error: any) {
    console.error('Get quiz error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, description, passingScore, questions } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 });
    }

    for (const q of questions) {
      if (!q.text?.trim()) return NextResponse.json({ error: 'All questions must have text' }, { status: 400 });
      if (!q.correctAnswer) return NextResponse.json({ error: 'All questions must have a correct answer' }, { status: 400 });
      if (!Array.isArray(q.options) || q.options.filter((o: string) => o.trim()).length < 2) {
        return NextResponse.json({ error: 'Each question must have at least 2 options' }, { status: 400 });
      }
    }

    const quizData = {
      courseId,
      title: title.trim(),
      description: description?.trim() || '',
      passingScore: Math.min(100, Math.max(1, Number(passingScore) || 70)),
      questions,
      createdBy: decoded.uid,
      updatedAt: new Date(),
    };

    await adminDb.collection('quizzes').doc(courseId).set(quizData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save quiz error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
