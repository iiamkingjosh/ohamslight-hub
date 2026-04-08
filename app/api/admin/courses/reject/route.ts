import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
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

    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });

    // You can either delete or set status to 'rejected'
    await adminDb.collection('courses').doc(courseId).update({
      status: 'rejected',
    });

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (courseDoc.exists) {
      const teacherUid = courseDoc.data()?.createdBy;
      const courseTitle = courseDoc.data()?.title || 'Your course';
      if (teacherUid) {
        const teacherDoc = await adminDb.collection('users').doc(teacherUid).get();
        const teacherEmail = teacherDoc.data()?.email;
        await createNotification(teacherUid, {
          title: 'Course rejected',
          message: `"${courseTitle}" was not approved. Please review and resubmit.`,
          type: 'course_rejected',
          link: '/teacher/courses',
        });

        if (teacherEmail) {
          await sendEmail({
            to: teacherEmail,
            subject: `Course update: ${courseTitle}`,
            html: `<p>Your course <strong>${courseTitle}</strong> was not approved. Please review and resubmit.</p>`,
          });
        }
      }
    }


    // Audit log
    await adminDb.collection('auditLogs').add({
      action: 'reject-course',
      performedBy: actorUid,
      targetCourse: courseId,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Reject course error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}