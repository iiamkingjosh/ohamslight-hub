'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { User } from '@/types';

export default function InviteAdminsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      void fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin-invites', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load students');
      }

      setStudents(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAction = async (uid: string, action: 'invite' | 'revoke') => {
    setActionLoading(uid);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(action === 'invite' ? 'Admin invitation sent' : 'Admin invitation revoked');
      await fetchStudents();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return students;
    }

    return students.filter((student) =>
      [student.fullName, student.email, student.username]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [search, students]);

  if (loading) {
    return <div>Loading students...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invite Students To Admin</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Superadmins can invite existing student accounts to become admins. Students keep their account and choose whether to accept or decline the promotion.
        </p>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Find a student</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or username"
          className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Invite Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No matching students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const invitationStatus = student.adminInvitation?.status ?? 'none';
                  const isPending = invitationStatus === 'pending';

                  return (
                    <tr key={student.uid}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{student.fullName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">@{student.username}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div>{student.email}</div>
                        <div>{student.phone || 'No phone added'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            invitationStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : invitationStatus === 'accepted'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                : invitationStatus === 'rejected'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {invitationStatus === 'none' ? 'Not invited' : invitationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <button
                            onClick={() => void handleInviteAction(student.uid, 'revoke')}
                            disabled={actionLoading === student.uid}
                            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {actionLoading === student.uid ? 'Working...' : 'Revoke invite'}
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleInviteAction(student.uid, 'invite')}
                            disabled={actionLoading === student.uid}
                            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {actionLoading === student.uid
                              ? 'Working...'
                              : invitationStatus === 'rejected'
                                ? 'Invite again'
                                : 'Send invite'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
