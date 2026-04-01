import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const teacherUid = decoded.uid;

    const teacherDoc = await adminDb.collection('users').doc(teacherUid).get();
    const teacherData = teacherDoc.data();
    if (!teacherData || teacherData.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('courses')
      .where('createdBy', '==', teacherUid)
      .orderBy('createdAt', 'desc')
      .get();

    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(courses);
  } catch (error: any) {
    console.error('Fetch teacher courses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const teacherUid = decoded.uid;

    const teacherDoc = await adminDb.collection('users').doc(teacherUid).get();
    const teacherData = teacherDoc.data();
    if (!teacherData || teacherData.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, description, price, category, coverImage } = await req.json();

    if (!title || !description || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const courseData = {
      title,
      description,
      price: Number(price),
      category,
      coverImage: coverImage || '',
      content: { sections: [] },
      averageRating: 0,
      reviewCount: 0,
      ratingSum: 0,
      createdBy: teacherUid,
      status: 'pending', // default pending
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection('courses').add(courseData);

    return NextResponse.json({ success: true, courseId: docRef.id });
  } catch (error: any) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}