import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const reviewsSnap = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('reviews')
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get();

    return NextResponse.json(reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const enrollmentSnap = await adminDb
      .collection('enrollments')
      .where('uid', '==', uid)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (enrollmentSnap.empty) {
      return NextResponse.json({ error: 'You must enroll before reviewing this course' }, { status: 403 });
    }

    const { rating, comment } = await req.json();
    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const user = userDoc.data();
    const reviewerName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Student';

    const reviewRef = adminDb.collection('courses').doc(courseId).collection('reviews').doc(uid);
    await reviewRef.set({
      uid,
      reviewerName,
      rating: numericRating,
      comment: (comment || '').toString().trim(),
      updatedAt: new Date(),
    }, { merge: true });

    const allReviewsSnap = await adminDb.collection('courses').doc(courseId).collection('reviews').get();
    const reviewCount = allReviewsSnap.size;
    const ratingSum = allReviewsSnap.docs.reduce((sum, d) => sum + Number(d.data().rating || 0), 0);
    const averageRating = reviewCount ? Number((ratingSum / reviewCount).toFixed(2)) : 0;

    await adminDb.collection('courses').doc(courseId).update({
      averageRating,
      reviewCount,
      ratingSum,
    });

    return NextResponse.json({ success: true, averageRating, reviewCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
