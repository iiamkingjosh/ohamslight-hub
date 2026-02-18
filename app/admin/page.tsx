'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface Stats {
  students: number;
  teachers: number;
  courses: number;
  enrollments: number;
  revenue: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;

  if (!stats) return <div className="text-center py-10">No data available.</div>;

  // Data for chart (example: weekly enrollments - you can replace with real data later)
  const chartData = [
    { name: 'Mon', value: 4 },
    { name: 'Tue', value: 7 },
    { name: 'Wed', value: 5 },
    { name: 'Thu', value: 9 },
    { name: 'Fri', value: 6 },
    { name: 'Sat', value: 2 },
    { name: 'Sun', value: 3 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Students</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.students}</p>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Teachers</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.teachers}</p>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Courses</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.courses}</p>
        </div>
        <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Enrollments</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.enrollments}</p>
        </div>
        <div className="bg-indigo-100 dark:bg-indigo-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Revenue ($)</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.revenue}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Weekly Enrollments</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}