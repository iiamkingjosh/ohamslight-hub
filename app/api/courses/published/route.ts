import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
  try {
    // Optional: verify user is logged in (but marketplace can be public)
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      // Allow public access? For now, require auth to see courses.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(idToken);

    const snapshot = await adminDb.collection('courses')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .get();

    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(courses);
  } catch (error: any) {
    console.error('Fetch published courses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}