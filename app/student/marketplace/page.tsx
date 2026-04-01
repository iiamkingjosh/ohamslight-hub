'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PaginationControls from '@/components/PaginationControls';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  coverImage?: string;
  createdBy: string;
  averageRating?: number;
  reviewCount?: number;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filtered, setFiltered] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [minRating, setMinRating] = useState(0);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [couponByCourse, setCouponByCourse] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    fetchCoursesAndBookmarks();
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    let next = [...courses];
    if (selectedCategory !== 'all') next = next.filter((c) => c.category === selectedCategory);
    if (priceFilter === 'free') next = next.filter((c) => Number(c.price || 0) <= 0);
    if (priceFilter === 'paid') next = next.filter((c) => Number(c.price || 0) > 0);
    if (minRating > 0) next = next.filter((c) => Number(c.averageRating || 0) >= minRating);
    if (q) {
      next = next.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    if (bookmarkedOnly) next = next.filter((c) => bookmarks.includes(c.id));
    setFiltered(next);
    setCurrentPage(1);
  }, [selectedCategory, courses, query, priceFilter, minRating, bookmarkedOnly, bookmarks]);

  const fetchCoursesAndBookmarks = async () => {
    try {
      const idToken = await user?.getIdToken();
      const [res, bmRes] = await Promise.all([
        fetch('/api/courses/published', {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        fetch('/api/student/bookmarks', {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ]);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCourses(data);

      if (bmRes.ok) {
        const bmData = await bmRes.json();
        setBookmarks(bmData.courseIds || []);
      }

      const uniqueCats = Array.from(new Set(data.map((c: Course) => c.category)));
      setCategories(uniqueCats as string[]);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (courseId: string) => {
    try {
      const idToken = await user?.getIdToken();
      const exists = bookmarks.includes(courseId);
      const res = await fetch('/api/student/bookmarks', {
        method: exists ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error('Bookmark update failed');
      setBookmarks((prev) =>
        exists ? prev.filter((id) => id !== courseId) : [...prev, courseId]
      );
    } catch {
      toast.error('Failed to update bookmark');
    }
  };

  const handleEnroll = async (courseId: string, couponCode?: string) => {
    setEnrollingId(courseId);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ courseId, couponCode: couponCode || '' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success('Enrolled successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setEnrollingId(null);
    }
  };

  const applyCoupon = async (courseId: string) => {
    try {
      const idToken = await user?.getIdToken();
      const code = (couponByCourse[courseId] || '').trim();
      if (!code) return;
      const res = await fetch(`/api/courses/${courseId}/coupon/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coupon invalid');
      toast.success(`Coupon applied. New price: $${Number(data.finalPrice).toFixed(2)}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startCheckout = async (courseId: string) => {
    setProcessingId(courseId);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          courseId,
          couponCode: (couponByCourse[courseId] || '').trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');

      if (data.freeAfterDiscount) {
        await handleEnroll(courseId, couponByCourse[courseId]);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error('No checkout url returned');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') !== 'success') return;
      const courseId = params.get('courseId');
      const sessionId = params.get('session_id');
      if (!courseId || !sessionId) return;

      try {
        const idToken = await user?.getIdToken();
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ sessionId, courseId }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

        await handleEnroll(courseId, couponByCourse[courseId]);
        toast.success('Payment verified. Enrollment complete!');
      } catch (e: any) {
        toast.error(e.message);
      }
    };
    if (user) run();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedCourses = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <LoadingSkeleton rows={8} />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Course Marketplace</h1>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, description, category"
          className="md:col-span-2 border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="all">All Categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as any)} className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="all">All Prices</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
        <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value={0}>All Ratings</option>
          <option value={4}>4★ and above</option>
          <option value={3}>3★ and above</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={bookmarkedOnly} onChange={(e) => setBookmarkedOnly(e.target.checked)} />
          Show bookmarked only
        </label>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {pagedCourses.map((course) => (
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
              <div className="mt-1 text-sm text-yellow-500">
                {'★'.repeat(Math.round(Number(course.averageRating || 0)))}
                <span className="text-gray-500 ml-2">{Number(course.averageRating || 0).toFixed(1)} ({course.reviewCount || 0})</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => toggleBookmark(course.id)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm">
                  {bookmarks.includes(course.id) ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  value={couponByCourse[course.id] || ''}
                  onChange={(e) => setCouponByCourse((p) => ({ ...p, [course.id]: e.target.value.toUpperCase() }))}
                  placeholder="Coupon"
                  className="flex-1 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
                <button onClick={() => applyCoupon(course.id)} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Apply</button>
              </div>

              <button
                onClick={() => Number(course.price || 0) > 0 ? startCheckout(course.id) : handleEnroll(course.id, couponByCourse[course.id])}
                disabled={enrollingId === course.id || processingId === course.id}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:bg-gray-400"
              >
                {enrollingId === course.id ? 'Enrolling...' : processingId === course.id ? 'Processing...' : Number(course.price || 0) > 0 ? 'Buy & Enroll' : 'Enroll Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-10">No courses available in this category.</p>
      )}
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}