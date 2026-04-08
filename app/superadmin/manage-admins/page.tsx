'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import toast from 'react-hot-toast';

export default function ManageAdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admins', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdmins(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminUid: string) => {
    if (!confirm('Are you sure you want to soft delete this admin?')) return;
    setActionLoading(adminUid);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/delete-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: adminUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Admin deleted');
      fetchAdmins(); // refresh
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (adminUid: string) => {
    setActionLoading(adminUid);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/restore-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: adminUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Admin restored');
      fetchAdmins();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore admin');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900 transition-colors dark:text-white">Manage Admins</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-gray-50 shadow transition-colors dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-200 transition-colors dark:bg-gray-800">
            <tr className="divide-x divide-gray-300 dark:divide-gray-700">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 transition-colors dark:text-gray-300">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 transition-colors dark:text-gray-300">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 transition-colors dark:text-gray-300">Username</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 transition-colors dark:text-gray-300">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 transition-colors dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white transition-colors dark:divide-gray-700 dark:bg-gray-900">
            {admins.map((admin) => (
              <tr key={admin.uid} className="divide-x divide-gray-200 transition-colors hover:bg-gray-50 dark:divide-gray-800 dark:hover:bg-gray-800/40">
                <td className="whitespace-nowrap px-6 py-4 text-gray-900 dark:text-gray-100">{admin.fullName}</td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-900 dark:text-gray-100">{admin.email}</td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-900 dark:text-gray-100">{admin.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    admin.deleted ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {admin.deleted ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {admin.deleted ? (
                    <button
                      onClick={() => handleRestore(admin.uid)}
                      disabled={actionLoading === admin.uid}
                      className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50"
                    >
                      {actionLoading === admin.uid ? '...' : 'Restore'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(admin.uid)}
                      disabled={actionLoading === admin.uid}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {actionLoading === admin.uid ? '...' : 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}