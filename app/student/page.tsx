'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ProgressRing from '@/components/ProgressRing';
import toast from 'react-hot-toast';

interface EnrolledCourse {
  enrollmentId: string;
  uid: string;
  courseId: string;
  progress: number;
  completed: boolean;
  enrolledAt: any;
  course: {
    id: string;
    title: string;
    coverImage?: string;
  };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    enrolled: 0,
    completed: 0,
    averageProgress: 0,
  });

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/student/courses', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEnrolled(data);
      
      const enrolledCount = data.length;
      const completedCount = data.filter((e: EnrolledCourse) => e.completed).length;
      const totalProgress = data.reduce((acc: number, e: EnrolledCourse) => acc + e.progress, 0);
      const avgProgress = enrolledCount > 0 ? Math.round(totalProgress / enrolledCount) : 0;

      setStats({
        enrolled: enrolledCount,
        completed: completedCount,
        averageProgress: avgProgress,
      });
    } catch (error) {
      toast.error('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Student Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Enrolled Courses</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.enrolled}</p>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Completed</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{stats.completed}</p>
        </div>
        <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Avg. Progress</h2>
          <div className="flex items-center">
            <ProgressRing progress={stats.averageProgress} size={60} strokeWidth={6} />
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Continue Learning</h2>
      {enrolled.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't enrolled in any courses yet.</p>
          <Link
            href="/student/marketplace"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enrolled.slice(0, 3).map((item) => (
            <div key={item.enrollmentId} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex items-center">
              {item.course?.coverImage && (
                <img src={item.course.coverImage} alt={item.course.title} className="w-20 h-20 object-cover rounded mr-4" />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.course?.title}</h3>
                <div className="flex items-center mt-2">
                  <div className="flex-1 mr-4">
                    <div className="bg-gray-200 dark:bg-gray-700 h-2 rounded">
                      <div
                        className="bg-blue-600 h-2 rounded"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.progress}%</span>
                </div>
              </div>
              <Link
                href={`/student/courses/${item.courseId}`}
                className="ml-4 text-blue-600 hover:underline"
              >
                Continue
              </Link>
            </div>
          ))}
          {enrolled.length > 3 && (
            <Link href="/student/my-learning" className="text-blue-600 hover:underline block text-right">
              View all courses →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}