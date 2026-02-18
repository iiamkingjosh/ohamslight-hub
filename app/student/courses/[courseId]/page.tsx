'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, []);

  const fetchCourse = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCourse(data);
    } catch (error) {
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
      <p className="mb-4">{course.description}</p>
      <p>Price: ${course.price}</p>
      {/* Placeholder for lessons/content */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">Course Content</h2>
        <p>Video lessons, quizzes, etc. will appear here.</p>
      </div>
    </div>
  );
}