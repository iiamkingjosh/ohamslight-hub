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
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filtered, setFiltered] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFiltered(courses);
    } else {
      setFiltered(courses.filter(c => c.category === selectedCategory));
    }
  }, [selectedCategory, courses]);

  const fetchCourses = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/courses/published', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCourses(data);
      // Extract unique categories
      const uniqueCats = Array.from(new Set(data.map((c: Course) => c.category)));
      setCategories(uniqueCats as string[]);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success('Enrolled successfully!');
      // Optionally remove from list or disable button
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) return <div>Loading marketplace...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Course Marketplace</h1>
      
      {/* Category Filter */}
      <div className="mb-6">
        <label className="mr-2 text-gray-700 dark:text-gray-300">Filter by category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => (
          <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {course.coverImage && (
              <img src={course.coverImage} alt={course.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{course.description}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-lg font-bold text-gray-900 dark:text-white">${course.price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-500">{course.category}</span>
              </div>
              <button
                onClick={() => handleEnroll(course.id)}
                disabled={enrollingId === course.id}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:bg-gray-400"
              >
                {enrollingId === course.id ? 'Enrolling...' : 'Enroll Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-10">No courses available in this category.</p>
      )}
    </div>
  );
}