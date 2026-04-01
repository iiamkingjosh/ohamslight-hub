'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { getOrCreateConversation } from '@/lib/chats';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const { user: currentUser, userData } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setUpdatingId(uid);
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, newRole }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success('Role updated');
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartChat = async (targetUid: string) => {
    if (!currentUser) return;
    if (currentUser.uid === targetUid) {
      toast.error('You cannot chat with yourself');
      return;
    }
    setStartingChatId(targetUid);
    try {
      const convId = await getOrCreateConversation(currentUser.uid, targetUid);
      router.push(`/chat/${convId}`);
    } catch (error) {
      toast.error('Failed to start chat');
    } finally {
      setStartingChatId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">User Management</h1>
      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((u) => (
              <tr key={u.uid}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{u.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    u.role === 'superadmin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    u.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    u.role === 'teacher' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    u.deleted ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {u.deleted ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {u.uid !== currentUser?.uid && userData?.role === 'admin' && u.role === 'admin' ? (
                      <span className="text-gray-400 text-sm">Cannot modify admin</span>
                    ) : u.role === 'superadmin' && userData?.role !== 'superadmin' ? (
                      <span className="text-gray-400 text-sm">Cannot modify superadmin</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        disabled={updatingId === u.uid}
                        className="border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        {userData?.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                      </select>
                    )}
                    {/* Message button – show for all users except self */}
                    {currentUser && u.uid !== currentUser.uid && (
                      <button
                        onClick={() => handleStartChat(u.uid)}
                        disabled={startingChatId === u.uid}
                        className="ml-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        title={`Send message to ${u.fullName}`}
                      >
                        {startingChatId === u.uid ? '...' : '💬'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}