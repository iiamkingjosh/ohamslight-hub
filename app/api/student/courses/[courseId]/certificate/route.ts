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

    const certId = `${decoded.uid}_${courseId}`;
    const certDoc = await adminDb.collection('certificates').doc(certId).get();

    if (!certDoc.exists) return NextResponse.json(null);

    return NextResponse.json({ id: certDoc.id, ...certDoc.data() });
  } catch (error: any) {
    console.error('Get certificate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
