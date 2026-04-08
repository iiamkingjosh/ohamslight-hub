import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const studentUid = decoded.uid;

    // Verify student role
    const studentDoc = await adminDb.collection('users').doc(studentUid).get();
    const studentData = studentDoc.data();
    if (!studentData || studentData.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { courseId, couponCode } = await req.json();
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseData = courseDoc.data()!;
    const basePrice = Number(courseData.price || 0);

    // Check if already enrolled
    const existing = await adminDb.collection('enrollments')
      .where('uid', '==', studentUid)
      .where('courseId', '==', courseId)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: 'Already enrolled' }, { status: 400 });
    }

    // If paid course, ensure a paid record exists; allow coupon that brings price to zero.
    let requiresPayment = basePrice > 0;
    if (requiresPayment && couponCode) {
      const normalizedCoupon = String(couponCode).trim().toUpperCase();
      const couponDoc = await adminDb.collection('courses').doc(courseId).collection('coupons').doc(normalizedCoupon).get();
      if (couponDoc.exists) {
        const c = couponDoc.data()!;
        const expired = c.expiresAt
          ? ((c.expiresAt?.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt)).getTime() < Date.now())
          : false;
        const exhausted = Number(c.usageLimit || 0) > 0 && Number(c.usedCount || 0) >= Number(c.usageLimit || 0);
        if (c.active && !expired && !exhausted) {
          const finalPrice = c.discountType === 'percent'
            ? Math.max(0, basePrice - (basePrice * Number(c.amount || 0)) / 100)
            : Math.max(0, basePrice - Number(c.amount || 0));
          if (finalPrice <= 0) {
            requiresPayment = false;
          }
        }
      }
    }

    if (requiresPayment) {
      const paymentSnap = await adminDb
        .collection('payments')
        .where('uid', '==', studentUid)
        .where('courseId', '==', courseId)
        .where('status', '==', 'paid')
        .limit(1)
        .get();
      if (paymentSnap.empty) {
        return NextResponse.json({ error: 'Payment required before enrollment' }, { status: 402 });
      }
    }

    // Create enrollment
    await adminDb.collection('enrollments').add({
      uid: studentUid,
      courseId,
      progress: 0,
      completed: false,
      completedLessons: [],
      lastLessonId: null,
      lastLessonAt: null,
      enrolledAt: new Date(),
    });

    // Notify the teacher
    if (courseDoc.exists) {
      const teacherUid = courseData?.createdBy;
      const courseTitle = courseData?.title || 'your course';
      if (teacherUid) {
        const teacherDoc = await adminDb.collection('users').doc(teacherUid).get();
        const teacherEmail = teacherDoc.data()?.email;
        const studentName = studentData.fullName ||
          `${studentData.firstName ?? ''} ${studentData.lastName ?? ''}`.trim() || 'A student';
        await createNotification(teacherUid, {
          title: 'New enrollment',
          message: `${studentName} enrolled in "${courseTitle}"`,
          type: 'new_enrollment',
          link: '/teacher/courses',
        });

        if (teacherEmail) {
          await sendEmail({
            to: teacherEmail,
            subject: `New enrollment in ${courseTitle}`,
            html: `<p><strong>${studentName}</strong> enrolled in your course <strong>${courseTitle}</strong>.</p>`,
          });
        }
      }
    }


    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Enrollment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}