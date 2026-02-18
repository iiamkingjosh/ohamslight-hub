'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, AuditLog } from '@/types';
import toast from 'react-hot-toast';

export default function SuperadminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalTeachers: 0,
    totalStudents: 0,
    recentLogs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const idToken = await user?.getIdToken();
      
      // Get counts from Firestore (you'll need to create a stats API or query directly)
      // For simplicity, we'll call the admins API and count
      const adminsRes = await fetch('/api/admins', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const admins = await adminsRes.json();
      
      // You could add similar APIs for teachers and students
      // For now, just show admin count
      setStats({
        totalAdmins: admins.length,
        totalTeachers: 0,
        totalStudents: 0,
        recentLogs: 0,
      });
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Superadmin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded shadow">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Total Admins</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.totalAdmins}</p>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded shadow">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Total Teachers</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.totalTeachers}</p>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded shadow">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Total Students</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.totalStudents}</p>
        </div>
        <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded shadow">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Recent Logs</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.recentLogs}</p>
        </div>
      </div>
    </div>
  );
}