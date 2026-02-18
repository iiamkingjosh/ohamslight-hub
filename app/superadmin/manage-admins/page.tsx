'use client';

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
    } catch (error: any) {
      toast.error(error.message);
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
    } catch (error: any) {
      toast.error(error.message);
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Manage Admins</h1>
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.uid}>
                <td className="px-6 py-4 whitespace-nowrap">{admin.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{admin.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{admin.username}</td>
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