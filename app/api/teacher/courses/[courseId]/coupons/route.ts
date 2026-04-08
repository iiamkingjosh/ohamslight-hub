import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

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
    if (!courseDoc.exists || courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snap = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('coupons')
      .orderBy('createdAt', 'desc')
      .get();

    return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists || courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { code, discountType, amount, usageLimit, expiresAt, active } = await req.json();
    const normalizedCode = normalizeCode((code || '').toString());
    if (!normalizedCode) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }
    if (!['percent', 'fixed'].includes(discountType)) {
      return NextResponse.json({ error: 'discountType must be percent or fixed' }, { status: 400 });
    }

    const numericAmount = Number(amount || 0);
    if (numericAmount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }
    if (discountType === 'percent' && numericAmount > 100) {
      return NextResponse.json({ error: 'percent coupon cannot exceed 100' }, { status: 400 });
    }

    const ref = adminDb.collection('courses').doc(courseId).collection('coupons').doc(normalizedCode);
    await ref.set({
      code: normalizedCode,
      discountType,
      amount: numericAmount,
      usageLimit: Number(usageLimit || 0),
      usedCount: 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      active: active !== false,
      createdAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
