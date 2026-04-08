import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ courseId: string }> }
) {
	try {
		const { courseId } = await params;
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		const enrollmentSnap = await adminDb
			.collection('enrollments')
			.where('uid', '==', decoded.uid)
			.where('courseId', '==', courseId)
			.limit(1)
			.get();

		if (enrollmentSnap.empty) {
			return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
		}

		const snap = await adminDb
			.collection('announcements')
			.doc(courseId)
			.collection('posts')
			.orderBy('createdAt', 'desc')
			.get();

		return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
