import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const { decision } = await req.json();

    if (!decision || !['accept', 'decline'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const invitation = userData.adminInvitation;
    if (!invitation || invitation.status !== 'pending') {
      return NextResponse.json({ error: 'No pending admin invitation found' }, { status: 400 });
    }

    const invitedBy = invitation.invitedBy;

    if (decision === 'accept') {
      await userRef.set(
        {
          role: 'admin',
          adminInvitation: {
            ...invitation,
            status: 'accepted',
            respondedAt: new Date(),
          },
        },
        { merge: true }
      );

      await adminDb.collection('auditLogs').add({
        action: 'accept-admin-invite',
        performedBy: uid,
        targetUser: uid,
        metadata: { invitedBy },
        timestamp: new Date(),
      });

      await adminDb.collection('notifications').doc(invitedBy).collection('items').add({
        title: 'Admin invitation accepted',
        message: `${userData.fullName || userData.email} accepted the admin invitation.`,
        type: 'admin_invite_accepted',
        link: '/superadmin/manage-admins',
        read: false,
        createdAt: new Date(),
      });
    }

    if (decision === 'decline') {
      await userRef.set(
        {
          adminInvitation: {
            ...invitation,
            status: 'rejected',
            respondedAt: new Date(),
          },
        },
        { merge: true }
      );

      await adminDb.collection('auditLogs').add({
        action: 'decline-admin-invite',
        performedBy: uid,
        targetUser: uid,
        metadata: { invitedBy },
        timestamp: new Date(),
      });

      await adminDb.collection('notifications').doc(invitedBy).collection('items').add({
        title: 'Admin invitation declined',
        message: `${userData.fullName || userData.email} declined the admin invitation.`,
        type: 'admin_invite_declined',
        link: '/superadmin/create-admin',
        read: false,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Respond admin invite error:', error);
    const message = error instanceof Error ? error.message : 'Failed to respond to invitation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}