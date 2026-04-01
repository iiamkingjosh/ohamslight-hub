import { adminDb } from '@/lib/firebaseAdmin';

export type NotificationType =
  | 'course_approved'
  | 'course_rejected'
  | 'new_enrollment'
  | 'announcement'
  | 'quiz_passed';

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType | string;
  link?: string;
}

export async function createNotification(uid: string, payload: NotificationPayload) {
  await adminDb
    .collection('notifications')
    .doc(uid)
    .collection('items')
    .add({ ...payload, read: false, createdAt: new Date() });
}
