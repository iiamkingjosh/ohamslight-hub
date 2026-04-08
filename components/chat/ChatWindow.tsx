'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

interface ChatWindowProps {
  conversationId: string;
  currentUserUid: string;
  otherUserUid: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
}

export default function ChatWindow({ conversationId, currentUserUid, otherUserUid }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId: currentUserUid,
      content: newMessage,
      timestamp: serverTimestamp(),
      readBy: [currentUserUid]
    });
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: newMessage,
      lastMessageTimestamp: serverTimestamp()
    });
    setNewMessage('');
  };

  void otherUserUid;

  return (
    <div className="flex flex-col h-96 border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded max-w-xs ${
              msg.senderId === currentUserUid
                ? 'bg-blue-500 text-white self-end ml-auto'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="border-t p-2 flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
}