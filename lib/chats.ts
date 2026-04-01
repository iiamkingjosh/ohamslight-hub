import { db } from './firebaseClient';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export async function getOrCreateConversation(uid1: string, uid2: string): Promise<string> {
  const conversationsRef = collection(db, 'conversations');
  const q = query(conversationsRef, where('participants', 'array-contains', uid1));
  const querySnapshot = await getDocs(q);

  const existing = querySnapshot.docs.find(doc => {
    const data = doc.data();
    return data.participants.includes(uid2);
  });

  if (existing) {
    return existing.id;
  }

  const newConvRef = await addDoc(conversationsRef, {
    participants: [uid1, uid2],
    lastMessage: '',
    lastMessageTimestamp: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return newConvRef.id;
}