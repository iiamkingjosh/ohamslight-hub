'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProgressRing from '@/components/ProgressRing';
import toast from 'react-hot-toast';

interface EnrolledCourse {
  enrollmentId: string;
  uid: string;
  courseId: string;
  progress: number;
  completed: boolean;
  enrolledAt: unknown;
  course: {
    id: string;
    title: string;
    coverImage?: string;
  };
}

export default function StudentDashboard() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteActionLoading, setInviteActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [teacherRequestLoading, setTeacherRequestLoading] = useState(false);
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
    } catch {
      toast.error('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const respondToAdminInvite = async (decision: 'accept' | 'decline') => {
    setInviteActionLoading(decision);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin-invites/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond to invite');
      }

      toast.success(
        decision === 'accept'
          ? 'Admin invitation accepted. Redirecting you to your new workspace...'
          : 'Admin invitation declined.'
      );

      if (decision === 'accept') {
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to respond to invite');
    } finally {
      setInviteActionLoading(null);
    }
  };

  const requestTeacherAccess = async () => {
    setTeacherRequestLoading(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/teacher-requests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit teacher request');
      }
      toast.success('Teacher access request submitted');
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit teacher request');
    } finally {
      setTeacherRequestLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Student Dashboard</h1>

      {userData?.adminInvitation?.status === 'pending' && (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-900/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Admin invitation pending</h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                A superadmin invited you to become an admin. Accepting will move this account from the student workspace into the admin workspace.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => void respondToAdminInvite('decline')}
                disabled={inviteActionLoading !== null}
                className="rounded border border-amber-400 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                {inviteActionLoading === 'decline' ? 'Declining...' : 'Decline'}
              </button>
              <button
                onClick={() => void respondToAdminInvite('accept')}
                disabled={inviteActionLoading !== null}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:opacity-50"
              >
                {inviteActionLoading === 'accept' ? 'Accepting...' : 'Accept invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {userData?.role === 'student' && (
        <div className="mb-8 rounded-xl border border-blue-300 bg-blue-50 p-5 dark:border-blue-700 dark:bg-blue-900/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200">Become a teacher</h2>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                Request teacher access if you want to create and manage courses on the platform.
              </p>
            </div>
            {userData.teacherRequest?.status === 'pending' ? (
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Request pending
              </span>
            ) : userData.teacherRequest?.status === 'rejected' ? (
              <button
                onClick={() => void requestTeacherAccess()}
                disabled={teacherRequestLoading}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {teacherRequestLoading ? 'Submitting...' : 'Request again'}
              </button>
            ) : (
              <button
                onClick={() => void requestTeacherAccess()}
                disabled={teacherRequestLoading}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {teacherRequestLoading ? 'Submitting...' : 'Request teacher access'}
              </button>
            )}
          </div>
        </div>
      )}

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
          <p className="text-gray-600 dark:text-gray-400 mb-4">You haven&apos;t enrolled in any courses yet.</p>
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