'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  title: string;
  price: number;
  category: string;
  status: string;
  createdAt: any;
}

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">My Courses</h1>
      {courses.length === 0 ? (
        <p>You haven't created any courses yet.</p>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between">
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
              <Link
                href={`/teacher/courses/${course.id}/edit`}
                className="text-blue-600 hover:underline"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}