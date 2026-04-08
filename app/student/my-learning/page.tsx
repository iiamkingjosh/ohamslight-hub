'use client';
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PaginationControls from '@/components/PaginationControls';

interface EnrolledCourse {
  enrollmentId: string;
  uid: string;
  courseId: string;
  progress: number;
  completed: boolean;
  lastLessonId?: string | null;
  lastLessonAt?: unknown;
  enrolledAt: unknown;
  course: {
    id: string;
    title: string;
    coverImage?: string;
    description?: string;
  };
}

export default function MyLearningPage() {
  const { user } = useAuth();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

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
    } catch {
      toast.error('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(enrolled.length / pageSize));
  const pagedEnrolled = enrolled.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">My Learning</h1>
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
          {pagedEnrolled.map((item) => (
            <div key={item.enrollmentId} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex items-center">
              {item.course.coverImage && (
                <img src={item.course.coverImage} alt={item.course.title} className="w-20 h-20 object-cover rounded mr-4" />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{item.course.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{item.course.description}</p>
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
                href={item.lastLessonId
                  ? `/student/courses/${item.courseId}/lessons/${item.lastLessonId}`
                  : `/student/courses/${item.courseId}`}
                className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                {item.lastLessonId ? 'Resume' : 'Continue'}
              </Link>
            </div>
          ))}
        </div>
      )}
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}