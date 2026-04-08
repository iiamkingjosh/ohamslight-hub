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
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();

    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = courseDoc.data()!;
    return NextResponse.json({
      id: courseDoc.id,
      title: data.title,
      description: data.description,
      content: data.content || { sections: [] },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const courseRef = adminDb.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (courseDoc.data()?.createdBy !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sections } = await req.json();
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Invalid payload: sections must be an array' }, { status: 400 });
    }

    for (const section of sections) {
      if (!section?.id || !section?.title || !Array.isArray(section.lessons)) {
        return NextResponse.json({ error: 'Each section needs id, title and lessons' }, { status: 400 });
      }
      for (const lesson of section.lessons) {
        if (!lesson?.id || !lesson?.title || !lesson?.type) {
          return NextResponse.json({ error: 'Each lesson needs id, title and type' }, { status: 400 });
        }
        if (!['video', 'text', 'link'].includes(lesson.type)) {
          return NextResponse.json({ error: 'Lesson type must be video, text or link' }, { status: 400 });
        }
      }
    }

    await courseRef.update({
      content: { sections },
      contentUpdatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
