'use client';

import { useAuth } from '@/contexts/AuthContext';
import ConversationList from '@/components/chat/ConversationList';

export default function ChatListPage() {
  const { user } = useAuth();
  if (!user) return <div>Loading...</div>;
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Conversations</h1>
      <ConversationList currentUserUid={user.uid} />
    </div>
  );
}