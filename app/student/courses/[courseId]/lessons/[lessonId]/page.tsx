'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'link';
  videoUrl?: string;
  content?: string;
  durationMin?: number;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState('Course');
  const [sections, setSections] = useState<Section[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    markVisited();
  }, [courseId, lessonId, user]);

  const fetchContent = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/student/courses/${courseId}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCourseTitle(data.course?.title || 'Course');
      setSections(data.content?.sections || []);
      setCompletedLessons(data.completedLessons || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const markVisited = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;
      await fetch(`/api/student/courses/${courseId}/lessons/${lessonId}/visit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Best-effort tracking.
    }
  };

  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons || []), [sections]);
  const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = lessonIndex >= 0 ? allLessons[lessonIndex] : null;
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;
  const isCompleted = completedLessons.includes(lessonId);

  const markComplete = async () => {
    if (isCompleted) return;
    setMarking(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/student/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');
      setCompletedLessons((prev) => [...prev, lessonId]);
      toast.success('Lesson marked as completed');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update progress');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-300">Lesson not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-400 hover:underline">Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">Back</button>
        <p className="text-sm text-gray-500">{courseTitle}</p>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">{lesson.title}</h1>
      <p className="text-sm text-gray-400 mb-6">Type: {lesson.type} {lesson.durationMin ? `• ${lesson.durationMin} min` : ''}</p>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        {lesson.type === 'video' && lesson.videoUrl ? (
          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
            <iframe
              src={lesson.videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        ) : lesson.type === 'link' ? (
          <a href={lesson.content} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
            {lesson.content}
          </a>
        ) : (
          <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">{lesson.content}</div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={markComplete}
          disabled={isCompleted || marking}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white"
        >
          {isCompleted ? 'Completed' : marking ? 'Saving...' : 'Mark Complete'}
        </button>

        {prevLesson && (
          <Link href={`/student/courses/${courseId}/lessons/${prevLesson.id}`} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">
            Previous Lesson
          </Link>
        )}

        {nextLesson ? (
          <Link href={`/student/courses/${courseId}/lessons/${nextLesson.id}`} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
            Next Lesson
          </Link>
        ) : (
          <Link href={`/student/courses/${courseId}`} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
            Back to Course
          </Link>
        )}
      </div>
    </div>
  );
}
