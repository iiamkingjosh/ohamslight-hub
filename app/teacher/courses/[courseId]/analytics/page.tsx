'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsResponse {
  course?: { title?: string };
  metrics: {
    totalEnrollments: number;
    completionRate: number;
    averageProgress: number;
    averageQuizScore: number;
    quizPassRate: number;
    revenue: number;
  };
  trend?: Array<{ date: string; enrollments: number }>;
}

export default function TeacherCourseAnalyticsPage() {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found.</div>;

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">Back</button>
        <h1 className="text-2xl font-bold text-white">Analytics: {data.course?.title}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4"><p className="text-gray-400 text-sm">Enrollments</p><p className="text-3xl text-white font-bold">{m.totalEnrollments}</p></div>
        <div className="bg-gray-800 rounded-xl p-4"><p className="text-gray-400 text-sm">Completion Rate</p><p className="text-3xl text-white font-bold">{m.completionRate}%</p></div>
        <div className="bg-gray-800 rounded-xl p-4"><p className="text-gray-400 text-sm">Avg Progress</p><p className="text-3xl text-white font-bold">{m.averageProgress}%</p></div>
        <div className="bg-gray-800 rounded-xl p-4"><p className="text-gray-400 text-sm">Avg Quiz Score</p><p className="text-3xl text-white font-bold">{m.averageQuizScore}%</p></div>
        <div className="bg-gray-800 rounded-xl p-4"><p className="text-gray-400 text-sm">Quiz Pass Rate</p><p className="text-3xl text-white font-bold">{m.quizPassRate}%</p></div>
        <div className="bg-gray-800 rounded-xl p-4"><p className="text-gray-400 text-sm">Revenue</p><p className="text-3xl text-white font-bold">${m.revenue}</p></div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Recent Enrollment Trend</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Bar dataKey="enrollments" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
