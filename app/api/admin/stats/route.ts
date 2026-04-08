import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
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

    // Get counts
    const [studentsSnap, teachersSnap, coursesSnap, enrollmentsSnap] = await Promise.all([
      adminDb.collection('users').where('role', '==', 'student').where('deleted', '==', false).count().get(),
      adminDb.collection('users').where('role', '==', 'teacher').where('deleted', '==', false).count().get(),
      adminDb.collection('courses').count().get(),
      adminDb.collection('enrollments').count().get(),
    ]);

    // Placeholder revenue (you can calculate from transactions later)
    const revenue = 0; // You'll replace with actual sum from payments

    return NextResponse.json({
      students: studentsSnap.data().count,
      teachers: teachersSnap.data().count,
      courses: coursesSnap.data().count,
      enrollments: enrollmentsSnap.data().count,
      revenue,
    });
  } catch (error: unknown) {
    console.error('Stats API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}