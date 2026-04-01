'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatWindow from '@/components/chat/ChatWindow';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user, userData } = useAuth();
  const [otherUid, setOtherUid] = useState<string>('');

  useEffect(() => {
    if (!user || !conversationId) return;
    const fetchOther = async () => {
      const convDoc = await getDoc(doc(db, 'conversations', conversationId as string));
      if (convDoc.exists()) {
        const other = convDoc.data().participants.find((uid: string) => uid !== user.uid);
        setOtherUid(other);
      }
    };
    fetchOther();
  }, [conversationId, user]);

  if (!user || !userData) return <div>Loading...</div>;
  if (!otherUid) return <div>Loading conversation...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      <ChatWindow
        conversationId={conversationId as string}
        currentUserUid={user.uid}
        otherUserUid={otherUid}
      />
    </div>
  );
}