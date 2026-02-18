'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  coverImage?: string;
  createdBy: string;
  status: string;
  createdAt: any;
}

export default function CourseApprovalPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingCourses();
  }, []);

  const fetchPendingCourses = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/courses/pending', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCourses(data);
    } catch (error) {
      toast.error('Failed to load pending courses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courseId: string) => {
    setProcessingId(courseId);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/courses/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error('Approval failed');
      toast.success('Course approved');
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (courseId: string) => {
    if (!confirm('Are you sure you want to reject this course?')) return;
    setProcessingId(courseId);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/courses/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error('Rejection failed');
      toast.success('Course rejected');
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Course Approval</h1>
      {courses.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No pending courses.</p>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{course.description}</p>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                  <span>Price: ${course.price}</span>
                  <span className="ml-4">Category: {course.category}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApprove(course.id)}
                  disabled={processingId === course.id}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {processingId === course.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(course.id)}
                  disabled={processingId === course.id}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {processingId === course.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}