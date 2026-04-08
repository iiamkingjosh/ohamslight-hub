import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';

async function verifyAccess(decoded: DecodedIdToken, courseId: string) {
	const courseDoc = await adminDb.collection('courses').doc(courseId).get();
	if (!courseDoc.exists) return false;
	if (courseDoc.data()?.createdBy === decoded.uid) return true;

	const enrollSnap = await adminDb
		.collection('enrollments')
		.where('uid', '==', decoded.uid)
		.where('courseId', '==', courseId)
		.limit(1)
		.get();

	return !enrollSnap.empty;
}

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ courseId: string }> }
) {
	try {
		const { courseId } = await params;
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		if (!(await verifyAccess(decoded, courseId))) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		const snap = await adminDb
			.collection('discussions')
			.doc(courseId)
			.collection('threads')
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
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		if (!(await verifyAccess(decoded, courseId))) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		const { title, body } = await req.json();
		if (!title?.trim() || !body?.trim()) {
			return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
		}

		const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
		const ud = userDoc.data();
		const authorName = ud?.fullName || `${ud?.firstName ?? ''} ${ud?.lastName ?? ''}`.trim() || 'Unknown';

		await adminDb
			.collection('discussions')
			.doc(courseId)
			.collection('threads')
			.add({
				courseId,
				authorUid: decoded.uid,
				authorName,
				title: title.trim(),
				body: body.trim(),
				replyCount: 0,
				createdAt: new Date(),
			});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
