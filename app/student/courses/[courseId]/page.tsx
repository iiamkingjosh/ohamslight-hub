'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'link';
  durationMin?: number;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [quizAvailable, setQuizAvailable] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [courseTitle, setCourseTitle] = useState('Course');
  const [courseDescription, setCourseDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const idToken = await user?.getIdToken();
      const headers = { Authorization: `Bearer ${idToken}` };

      const [quizRes, certRes, contentRes, reviewRes] = await Promise.all([
        fetch(`/api/student/courses/${courseId}/quiz`, { headers }),
        fetch(`/api/student/courses/${courseId}/certificate`, { headers }),
        fetch(`/api/student/courses/${courseId}/content`, { headers }),
        fetch(`/api/courses/${courseId}/reviews`),
      ]);

      if (quizRes.ok) {
        const quizData = await quizRes.json();
        setQuizAvailable(!!quizData?.quiz);
      }
      if (certRes.ok) {
        const certData = await certRes.json();
        setCertificate(certData);
      }
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setCourseTitle(contentData.course?.title || 'Course');
        setCourseDescription(contentData.course?.description || '');
        setSections(contentData.content?.sections || []);
        setCompletedLessons(contentData.completedLessons || []);
        setProgress(contentData.progress || 0);
      }
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        setReviews(Array.isArray(reviewData) ? reviewData : []);
      }
    } catch {
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');
      toast.success('Review submitted');
      setComment('');
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white mb-2">{courseTitle}</h1>
      {courseDescription && <p className="text-gray-400 mb-6">{courseDescription}</p>}

      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Course Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded">
          <div className="h-2 bg-blue-600 rounded" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-white">Course Content</h2>
        {sections.length === 0 ? (
          <p className="text-gray-500 text-sm">Your instructor has not added lessons yet.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <div key={section.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Section {sIdx + 1}: {section.title}</h3>
                <div className="space-y-2">
                  {section.lessons.map((lesson, lIdx) => {
                    const done = completedLessons.includes(lesson.id);
                    return (
                      <Link
                        key={lesson.id}
                        href={`/student/courses/${courseId}/lessons/${lesson.id}`}
                        className="flex items-center justify-between bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 transition-colors"
                      >
                        <div>
                          <p className="text-sm text-white">
                            {sIdx + 1}.{lIdx + 1} {lesson.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {lesson.type.toUpperCase()} {lesson.durationMin ? `• ${lesson.durationMin} min` : ''}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${done ? 'text-green-400' : 'text-gray-400'}`}>
                          {done ? 'Completed' : 'Start'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Course Activities</h2>
        <div className="flex flex-wrap gap-4">
          {quizAvailable ? (
            <Link
              href={`/student/courses/${courseId}/quiz`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              {certificate ? 'Retake Quiz' : 'Take Quiz'}
            </Link>
          ) : (
            <p className="text-gray-500 text-sm">No quiz has been added to this course yet.</p>
          )}

          {certificate && (
            <Link
              href={`/student/courses/${courseId}/certificate`}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              View Certificate 🎓
            </Link>
          )}

          <Link
            href={`/student/courses/${courseId}/announcements`}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            📢 Announcements
          </Link>
          <Link
            href={`/student/courses/${courseId}/discussion`}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            💬 Discussion Board
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4 text-white">Reviews & Ratings</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-300 mb-2">Leave your review</p>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-400">Rating</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="bg-gray-700 text-white rounded px-2 py-1">
              <option value={5}>5</option>
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
              <option value={1}>1</option>
            </select>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your experience"
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
          />
          <button
            onClick={submitReview}
            disabled={submittingReview}
            className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
          >
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex justify-between">
                  <p className="text-white font-semibold">{r.reviewerName}</p>
                  <p className="text-yellow-400">{'★'.repeat(Number(r.rating || 0))}</p>
                </div>
                {r.comment && <p className="text-sm text-gray-300 mt-2">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}