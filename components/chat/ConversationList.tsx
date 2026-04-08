'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import Link from 'next/link';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: unknown;
}

interface ConversationListProps {
  currentUserUid: string;
}

export default function ConversationList({ currentUserUid }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserUid),
      orderBy('lastMessageTimestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));
    });
  }, [currentUserUid]);

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const otherUid = conv.participants.find(uid => uid !== currentUserUid);
        // You'd fetch the other user's name here (e.g., from users collection)
        return (
          <Link key={conv.id} href={`/chat/${conv.id}`}>
            <div className="p-3 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <div className="font-semibold">User {otherUid}</div>
              <div className="text-sm text-gray-500 truncate">{conv.lastMessage}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}