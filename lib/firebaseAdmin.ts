import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    const credential =
      projectId && clientEmail && privateKey
        ? admin.credential.cert({ projectId, clientEmail, privateKey })
        : admin.credential.applicationDefault();

    admin.initializeApp({
      credential,
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();