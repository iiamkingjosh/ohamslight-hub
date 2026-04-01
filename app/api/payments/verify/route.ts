import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured' }, { status: 500 });
    }

    const { sessionId, courseId } = await req.json();
    if (!sessionId || !courseId) {
      return NextResponse.json({ error: 'sessionId and courseId are required' }, { status: 400 });
    }

    const existing = await adminDb.collection('payments').where('sessionId', '==', sessionId).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      return NextResponse.json({ error: stripeData?.error?.message || 'Failed to verify session' }, { status: 500 });
    }

    if (stripeData.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const paidUid = stripeData?.metadata?.userUid;
    const paidCourseId = stripeData?.metadata?.courseId;
    const couponCode = stripeData?.metadata?.couponCode || null;

    if (paidUid !== decoded.uid || paidCourseId !== courseId) {
      return NextResponse.json({ error: 'Payment metadata mismatch' }, { status: 403 });
    }

    await adminDb.collection('payments').add({
      uid: decoded.uid,
      courseId,
      sessionId,
      amount: Number((stripeData.amount_total || 0) / 100),
      currency: stripeData.currency || 'usd',
      status: 'paid',
      couponCode,
      createdAt: new Date(),
    });

    if (couponCode) {
      await adminDb
        .collection('courses')
        .doc(courseId)
        .collection('coupons')
        .doc(String(couponCode).toUpperCase())
        .update({ usedCount: FieldValue.increment(1) });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
