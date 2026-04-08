import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
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
	{ params }: { params: Promise<{ courseId: string; threadId: string }> }
) {
	try {
		const { courseId, threadId } = await params;
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		if (!(await verifyAccess(decoded, courseId))) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		const threadRef = adminDb
			.collection('discussions')
			.doc(courseId)
			.collection('threads')
			.doc(threadId);

		const [threadDoc, repliesSnap] = await Promise.all([
			threadRef.get(),
			threadRef.collection('replies').orderBy('createdAt', 'asc').get(),
		]);

		if (!threadDoc.exists) {
			return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
		}

		return NextResponse.json({
			thread: { id: threadDoc.id, ...threadDoc.data() },
			replies: repliesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ courseId: string; threadId: string }> }
) {
	try {
		const { courseId, threadId } = await params;
		const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
		if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const decoded = await adminAuth.verifyIdToken(idToken);

		if (!(await verifyAccess(decoded, courseId))) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		const { body } = await req.json();
		if (!body?.trim()) {
			return NextResponse.json({ error: 'Reply body is required' }, { status: 400 });
		}

		const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
		const ud = userDoc.data();
		const authorName = ud?.fullName || `${ud?.firstName ?? ''} ${ud?.lastName ?? ''}`.trim() || 'Unknown';

		const threadRef = adminDb
			.collection('discussions')
			.doc(courseId)
			.collection('threads')
			.doc(threadId);

		await Promise.all([
			threadRef.collection('replies').add({
				threadId,
				authorUid: decoded.uid,
				authorName,
				body: body.trim(),
				createdAt: new Date(),
			}),
			threadRef.update({ replyCount: FieldValue.increment(1) }),
		]);

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
