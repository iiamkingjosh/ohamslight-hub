import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

interface CouponData {
  discountType: 'percent' | 'fixed';
  amount?: number;
}

interface StoredCoupon extends CouponData {
  active?: boolean;
  expiresAt?: Date | string | number | { toDate?: () => Date } | null;
  usageLimit?: number;
  usedCount?: number;
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

export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);

    const { courseId, couponCode } = await req.json();
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured' }, { status: 500 });
    }

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const course = courseDoc.data()!;
    const basePrice = Number(course.price || 0);

    let coupon: CouponData | null = null;
    let normalizedCoupon = '';
    if (couponCode) {
      normalizedCoupon = String(couponCode).trim().toUpperCase();
      const couponDoc = await adminDb.collection('courses').doc(courseId).collection('coupons').doc(normalizedCoupon).get();
      if (couponDoc.exists) {
        const c = couponDoc.data() as StoredCoupon;
        const expiresAtValue = c.expiresAt;
        let expired = false;
        if (expiresAtValue) {
          let exp: Date;
          if (
            typeof expiresAtValue === 'object' &&
            expiresAtValue !== null &&
            'toDate' in expiresAtValue &&
            typeof expiresAtValue.toDate === 'function'
          ) {
            exp = expiresAtValue.toDate();
          } else if (expiresAtValue instanceof Date) {
            exp = expiresAtValue;
          } else {
            exp = new Date(String(expiresAtValue));
          }
          expired = exp.getTime() < Date.now();
        }
        const exhausted = Number(c.usageLimit || 0) > 0 && Number(c.usedCount || 0) >= Number(c.usageLimit || 0);
        const validDiscountType = c.discountType === 'percent' || c.discountType === 'fixed';
        if (c.active && !expired && !exhausted && validDiscountType) {
          coupon = { discountType: c.discountType, amount: c.amount };
        }
      }
    }

    const { finalPrice, discount } = calculateDiscountedPrice(basePrice, coupon);

    if (finalPrice <= 0) {
      return NextResponse.json({
        freeAfterDiscount: true,
        amount: 0,
        discount,
        couponCode: coupon ? normalizedCoupon : null,
      });
    }

    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/student/marketplace?checkout=success&courseId=${courseId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/student/marketplace?checkout=cancel`;

    const body = new URLSearchParams();
    body.append('mode', 'payment');
    body.append('success_url', successUrl);
    body.append('cancel_url', cancelUrl);
    body.append('payment_method_types[]', 'card');
    body.append('line_items[0][price_data][currency]', 'usd');
    body.append('line_items[0][price_data][product_data][name]', String(course.title || 'Course'));
    body.append('line_items[0][price_data][unit_amount]', String(Math.round(finalPrice * 100)));
    body.append('line_items[0][quantity]', '1');
    body.append('metadata[userUid]', decoded.uid);
    body.append('metadata[courseId]', courseId);
    body.append('metadata[couponCode]', coupon ? normalizedCoupon : '');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      return NextResponse.json({ error: stripeData?.error?.message || 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({
      checkoutUrl: stripeData.url,
      sessionId: stripeData.id,
      amount: finalPrice,
      discount,
      couponCode: coupon ? normalizedCoupon : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
