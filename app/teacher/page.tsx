'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  title: string;
  status: string;
  createdAt: unknown;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/teacher/courses', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Teacher Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Total Courses</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">{courses.length}</p>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pending</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">
            {courses.filter(c => c.status === 'pending').length}
          </p>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Published</h2>
          <p className="text-3xl text-gray-900 dark:text-gray-200">
            {courses.filter(c => c.status === 'published').length}
          </p>
        </div>
      </div>
      <Link
        href="/teacher/create-course"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Create New Course
      </Link>
    </div>
  );
}