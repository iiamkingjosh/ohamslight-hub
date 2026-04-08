import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

interface CouponData {
  discountType: 'percent' | 'fixed';
  amount?: number;
}

function calculateDiscountedPrice(base: number, coupon: CouponData | null) {
  if (!coupon) return { finalPrice: base, discount: 0 };
  if (coupon.discountType === 'percent') {
    const discount = (base * Number(coupon.amount || 0)) / 100;
    return { finalPrice: Math.max(0, base - discount), discount };
  }
  const discount = Number(coupon.amount || 0);
  return { finalPrice: Math.max(0, base - discount), discount };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await adminAuth.verifyIdToken(token);

    const { code } = await req.json();
    const normalizedCode = (code || '').toString().trim().toUpperCase();
    if (!normalizedCode) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const couponDoc = await adminDb.collection('courses').doc(courseId).collection('coupons').doc(normalizedCode).get();
    if (!couponDoc.exists) return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });

    const coupon = couponDoc.data()!;
    if (!coupon.active) return NextResponse.json({ error: 'Coupon is inactive' }, { status: 400 });
    if (coupon.expiresAt) {
      const exp = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
      if (exp.getTime() < Date.now()) {
        return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
      }
    }
    if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || 0)) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    const basePrice = Number(courseDoc.data()?.price || 0);
    const { finalPrice, discount } = calculateDiscountedPrice(basePrice, coupon);

    return NextResponse.json({
      valid: true,
      code: normalizedCode,
      basePrice,
      discount,
      finalPrice,
      coupon: {
        discountType: coupon.discountType,
        amount: coupon.amount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
