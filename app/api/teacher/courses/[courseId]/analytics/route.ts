import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const enrollmentsSnap = await adminDb.collection('enrollments').where('courseId', '==', courseId).get();
    const attemptsSnap = await adminDb.collection('quiz_attempts').where('courseId', '==', courseId).get();

    const enrollments = enrollmentsSnap.docs.map((d) => d.data());
    const completions = enrollments.filter((e) => e.completed).length;
    const avgProgress = enrollments.length
      ? Number((enrollments.reduce((s, e) => s + Number(e.progress || 0), 0) / enrollments.length).toFixed(2))
      : 0;

    const passAttempts = attemptsSnap.docs.filter((d) => d.data().passed).length;
    const avgQuizScore = attemptsSnap.size
      ? Number((attemptsSnap.docs.reduce((s, d) => s + Number(d.data().score || 0), 0) / attemptsSnap.size).toFixed(2))
      : 0;

    const price = Number(courseDoc.data()?.price || 0);
    const revenue = Number((price * enrollments.length).toFixed(2));

    const byDay: Record<string, number> = {};
    for (const doc of enrollmentsSnap.docs) {
      const enrolledAt = doc.data().enrolledAt;
      const dt = enrolledAt?.toDate ? enrolledAt.toDate() : new Date(enrolledAt);
      const key = dt.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + 1;
    }

    const trend = Object.keys(byDay)
      .sort()
      .slice(-14)
      .map((date) => ({ date, enrollments: byDay[date] }));

    return NextResponse.json({
      course: {
        id: courseDoc.id,
        title: courseDoc.data()?.title,
        price,
        averageRating: Number(courseDoc.data()?.averageRating || 0),
        reviewCount: Number(courseDoc.data()?.reviewCount || 0),
      },
      metrics: {
        totalEnrollments: enrollments.length,
        completedStudents: completions,
        completionRate: enrollments.length ? Number(((completions / enrollments.length) * 100).toFixed(2)) : 0,
        averageProgress: avgProgress,
        averageQuizScore: avgQuizScore,
        quizPassRate: attemptsSnap.size ? Number(((passAttempts / attemptsSnap.size) * 100).toFixed(2)) : 0,
        revenue,
      },
      trend,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
