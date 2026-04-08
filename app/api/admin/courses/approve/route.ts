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

    await adminDb.collection('courses').doc(courseId).update({
      status: 'published',
    });

    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (courseDoc.exists) {
      const teacherUid = courseDoc.data()?.createdBy;
      const courseTitle = courseDoc.data()?.title || 'Your course';
      if (teacherUid) {
        const teacherDoc = await adminDb.collection('users').doc(teacherUid).get();
        const teacherEmail = teacherDoc.data()?.email;
        await createNotification(teacherUid, {
          title: 'Course approved!',
          message: `"${courseTitle}" has been approved and is now published.`,
          type: 'course_approved',
          link: '/teacher/courses',
        });

        if (teacherEmail) {
          await sendEmail({
            to: teacherEmail,
            subject: `Course approved: ${courseTitle}`,
            html: `<p>Your course <strong>${courseTitle}</strong> has been approved and published.</p>`,
          });
        }
      }
    }


    // Optional: audit log
    await adminDb.collection('auditLogs').add({
      action: 'approve-course',
      performedBy: actorUid,
      targetCourse: courseId,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Approve course error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}