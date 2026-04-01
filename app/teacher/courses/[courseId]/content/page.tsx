'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface LessonDraft {
  id: string;
  title: string;
  type: 'video' | 'text' | 'link';
  videoUrl?: string;
  content?: string;
  durationMin?: number;
}

interface SectionDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

function newLesson(): LessonDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    type: 'video',
    videoUrl: '',
    content: '',
    durationMin: 5,
  };
}

function newSection(): SectionDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    lessons: [newLesson()],
  };
}

export default function CourseContentBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseTitle, setCourseTitle] = useState('Course');
  const [sections, setSections] = useState<SectionDraft[]>([]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      const data = await res.json();
      setCourseTitle(data.title || 'Course');
      setSections(data.content?.sections?.length ? data.content.sections : [newSection()]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => setSections((prev) => [...prev, newSection()]);

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title } : s)));
  };

  const addLesson = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson()] } : s))
    );
  };

  const removeLesson = (sectionId: string, lessonId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
          : s
      )
    );
  };

  const updateLesson = (sectionId: string, lessonId: string, patch: Partial<LessonDraft>) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
        };
      })
    );
  };

  const validate = () => {
    if (!sections.length) return 'Add at least one section';
    for (let si = 0; si < sections.length; si++) {
      const s = sections[si];
      if (!s.title.trim()) return `Section ${si + 1} needs a title`;
      if (!s.lessons.length) return `Section ${si + 1} needs at least one lesson`;
      for (let li = 0; li < s.lessons.length; li++) {
        const l = s.lessons[li];
        if (!l.title.trim()) return `Lesson ${li + 1} in Section ${si + 1} needs a title`;
        if (l.type === 'video' && !l.videoUrl?.trim()) return `Video URL required for lesson ${li + 1} in Section ${si + 1}`;
        if ((l.type === 'text' || l.type === 'link') && !l.content?.trim()) return `Content required for lesson ${li + 1} in Section ${si + 1}`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Course content saved');
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">Back</button>
        <h1 className="text-2xl font-bold text-white">Content Builder: {courseTitle}</h1>
      </div>

      <div className="space-y-6">
        {sections.map((section, sectionIdx) => (
          <div key={section.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex gap-3 items-center mb-4">
              <input
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                placeholder={`Section ${sectionIdx + 1} title`}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => removeSection(section.id)}
                className="text-xs px-3 py-2 rounded bg-red-700 hover:bg-red-600 text-white"
              >
                Remove Section
              </button>
            </div>

            <div className="space-y-3">
              {section.lessons.map((lesson, lessonIdx) => (
                <div key={lesson.id} className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                  <div className="grid md:grid-cols-4 gap-3 mb-3">
                    <input
                      value={lesson.title}
                      onChange={(e) => updateLesson(section.id, lesson.id, { title: e.target.value })}
                      placeholder={`Lesson ${lessonIdx + 1} title`}
                      className="md:col-span-2 bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                    <select
                      value={lesson.type}
                      onChange={(e) => updateLesson(section.id, lesson.id, { type: e.target.value as LessonDraft['type'] })}
                      className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    >
                      <option value="video">Video</option>
                      <option value="text">Text</option>
                      <option value="link">Resource Link</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={lesson.durationMin || 5}
                      onChange={(e) => updateLesson(section.id, lesson.id, { durationMin: Number(e.target.value) })}
                      placeholder="Duration (min)"
                      className="bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                  </div>

                  {lesson.type === 'video' ? (
                    <input
                      value={lesson.videoUrl || ''}
                      onChange={(e) => updateLesson(section.id, lesson.id, { videoUrl: e.target.value })}
                      placeholder="Video URL (YouTube/Vimeo/embed link)"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                  ) : (
                    <textarea
                      rows={3}
                      value={lesson.content || ''}
                      onChange={(e) => updateLesson(section.id, lesson.id, { content: e.target.value })}
                      placeholder={lesson.type === 'text' ? 'Lesson content text' : 'Resource URL or notes'}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                  )}

                  <div className="mt-3">
                    <button
                      onClick={() => removeLesson(section.id, lesson.id)}
                      className="text-xs px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white"
                    >
                      Remove Lesson
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => addLesson(section.id)}
              className="mt-3 text-sm px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white"
            >
              + Add Lesson
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={addSection} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">
          + Add Section
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white"
        >
          {saving ? 'Saving...' : 'Save Content'}
        </button>
      </div>
    </div>
  );
}
