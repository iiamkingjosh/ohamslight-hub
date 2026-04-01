import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ courseId: string }> }
) {
	try {
		const { courseId } = await params;
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		const courseDoc = await adminDb.collection('courses').doc(courseId).get();
		if (!courseDoc.exists || courseDoc.data()?.createdBy !== decoded.uid) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const snap = await adminDb
			.collection('announcements')
			.doc(courseId)
			.collection('posts')
			.orderBy('createdAt', 'desc')
			.get();

		return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ courseId: string }> }
) {
	try {
		const { courseId } = await params;
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		const courseDoc = await adminDb.collection('courses').doc(courseId).get();
		if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
		if (courseDoc.data()?.createdBy !== decoded.uid) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { title, body } = await req.json();
		if (!title?.trim() || !body?.trim()) {
			return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
		}

		await adminDb
			.collection('announcements')
			.doc(courseId)
			.collection('posts')
			.add({
				courseId,
				teacherUid: decoded.uid,
				title: title.trim(),
				body: body.trim(),
				createdAt: new Date(),
			});

		const courseTitle = courseDoc.data()?.title || 'Your course';
		const enrollmentsSnap = await adminDb
			.collection('enrollments')
			.where('courseId', '==', courseId)
			.get();

		await Promise.all(
			enrollmentsSnap.docs.map(async (doc) => {
				const studentUid = doc.data().uid;
				await createNotification(studentUid, {
					title: `New announcement in "${courseTitle}"`,
					message: title.trim(),
					type: 'announcement',
					link: `/student/courses/${courseId}/announcements`,
				});

				const studentDoc = await adminDb.collection('users').doc(studentUid).get();
				const studentEmail = studentDoc.data()?.email;
				if (studentEmail) {
					await sendEmail({
						to: studentEmail,
						subject: `New announcement: ${courseTitle}`,
						html: `<p><strong>${title.trim()}</strong></p><p>${body.trim()}</p>`,
					});
				}
			})
		);

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
