'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PaginationControls from '@/components/PaginationControls';

interface Course {
  id: string;
  title: string;
  price: number;
  category: string;
  status: string;
  createdAt: unknown;
}

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/teacher/courses', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCourses(data);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
  const pagedCourses = courses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">My Courses</h1>
      {courses.length === 0 ? (
        <p>You haven&apos;t created any courses yet.</p>
      ) : (
        <div className="space-y-4">
          {pagedCourses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">${course.price} - {course.category}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Status: <span className={`font-semibold ${
                    course.status === 'published' ? 'text-green-600' :
                    course.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{course.status}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/teacher/courses/${course.id}/edit`}
                  className="text-blue-400 hover:underline text-sm"
                >
                  Edit
                </Link>
                <Link
                  href={`/teacher/courses/${course.id}/content`}
                  className="text-cyan-400 hover:underline text-sm"
                >
                  Content
                </Link>
                <Link
                  href={`/teacher/courses/${course.id}/quiz`}
                  className="text-purple-400 hover:underline text-sm"
                >
                  Manage Quiz
                </Link>
                <Link
                  href={`/teacher/courses/${course.id}/announcements`}
                  className="text-yellow-400 hover:underline text-sm"
                >
                  Announcements
                </Link>
                <Link
                  href={`/teacher/courses/${course.id}/discussion`}
                  className="text-green-400 hover:underline text-sm"
                >
                  Discussion
                </Link>
                <Link
                  href={`/teacher/courses/${course.id}/analytics`}
                  className="text-orange-400 hover:underline text-sm"
                >
                  Analytics
                </Link>
                <Link
                  href={`/teacher/courses/${course.id}/coupons`}
                  className="text-pink-400 hover:underline text-sm"
                >
                  Coupons
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}